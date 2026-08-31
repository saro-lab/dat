package dat

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"reflect"
	"strconv"
	"strings"
	"testing"
	"time"
)

type cmsFixture struct {
	Certificates map[string]struct {
		Wire string `json:"wire_ascii"`
	} `json:"certificates"`
	States map[string]struct {
		Certificates []string `json:"certificates"`
		Issuer       *string  `json:"issuer"`
		Version      string   `json:"version"`
	} `json:"states"`
	Cases []struct {
		ID      string `json:"id"`
		Initial string `json:"initial"`
		Input   struct {
			Kind   string      `json:"kind"`
			Status int         `json:"status"`
			Body   [][2]string `json:"body"`
			Phase  string      `json:"phase"`
		} `json:"input"`
		Expect          cmsFixtureExpectation            `json:"expect"`
		ExpectByProfile map[string]cmsFixtureExpectation `json:"expect_by_profile"`
	} `json:"cases"`
}

type cmsFixtureExpectation struct {
	State string  `json:"state"`
	Error *string `json:"error"`
	Retry string  `json:"retry"`
}

func loadCmsFixture(t *testing.T) cmsFixture {
	t.Helper()
	b, err := os.ReadFile("testdata/cms_v1_state_transitions.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixture cmsFixture
	if err := json.Unmarshal(b, &fixture); err != nil {
		t.Fatal(err)
	}
	return fixture
}

func fixtureBody(t *testing.T, fixture cmsFixture, segments [][2]string) []byte {
	t.Helper()
	var body []byte
	for _, segment := range segments {
		switch segment[0] {
		case "ascii":
			body = append(body, []byte(segment[1])...)
		case "hex":
			decoded, err := hex.DecodeString(segment[1])
			if err != nil {
				t.Fatal(err)
			}
			body = append(body, decoded...)
		case "certificate":
			body = append(body, fixture.Certificates[segment[1]].Wire...)
		default:
			t.Fatalf("unknown fixture body segment %q", segment[0])
		}
	}
	return body
}

func fixtureManager(t *testing.T, fixture cmsFixture, stateName, endpoint string, client *http.Client) *CmsManager {
	t.Helper()
	state := fixture.States[stateName]
	manager := NewManager()
	var certs []string
	for _, name := range state.Certificates {
		certs = append(certs, fixture.Certificates[name].Wire)
	}
	if len(certs) > 0 {
		if _, err := manager.Import(strings.Join(certs, "\n"), false); err != nil {
			t.Fatal(err)
		}
	}
	version, err := strconv.ParseUint(state.Version, 10, 64)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	m := &CmsManager{
		url: endpoint, manager: manager, client: client, ctx: ctx, cancel: cancel,
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
	m.version.Store(version)
	m.lastError.Store(lastSyncError{ErrCmsNotSynced})
	return m
}

func assertFixtureState(t *testing.T, fixture cmsFixture, m *CmsManager, expected string) {
	t.Helper()
	state := fixture.States[expected]
	if got := strconv.FormatUint(m.GetVersion(), 10); got != state.Version {
		t.Errorf("version: got %s, want %s", got, state.Version)
	}
	wantCids := make([]uint64, 0, len(state.Certificates))
	for _, name := range state.Certificates {
		cert, err := ParseCertificate(fixture.Certificates[name].Wire)
		if err != nil {
			t.Fatal(err)
		}
		wantCids = append(wantCids, cert.Cid)
	}
	if got := m.manager.ExportCids(); !reflect.DeepEqual(got, wantCids) {
		t.Errorf("certificate CIDs: got %v, want %v", got, wantCids)
	}
	m.manager.mu.RLock()
	issuer := m.manager.issuer
	m.manager.mu.RUnlock()
	if state.Issuer == nil {
		if issuer != nil {
			t.Errorf("issuer: got %x, want nil", issuer.Cid)
		}
	} else {
		want, err := ParseCertificate(fixture.Certificates[*state.Issuer].Wire)
		if err != nil {
			t.Fatal(err)
		}
		if issuer == nil || issuer.Cid != want.Cid {
			t.Errorf("issuer mismatch")
		}
	}
}

type failingBody struct{}

func (failingBody) Read([]byte) (int, error) { return 0, errors.New("body receive failed") }
func (failingBody) Close() error             { return nil }

type fixtureTransport struct{ phase string }

func (t fixtureTransport) RoundTrip(*http.Request) (*http.Response, error) {
	if t.phase == "connect" {
		return nil, errors.New("connect failed")
	}
	return &http.Response{StatusCode: 200, Body: failingBody{}, Header: make(http.Header)}, nil
}

type responseTransport struct {
	status int
	body   []byte
	t      *testing.T
}

func (transport responseTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.URL.Path != "/v1/certs" {
		transport.t.Errorf("path: got %q", req.URL.Path)
	}
	return &http.Response{
		StatusCode: transport.status,
		Body:       io.NopCloser(strings.NewReader(string(transport.body))),
		Header:     make(http.Header),
	}, nil
}

type blockingTransport struct{ started chan struct{} }

func (transport blockingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	close(transport.started)
	<-req.Context().Done()
	return nil, req.Context().Err()
}

func TestCmsStateTransitionFixture(t *testing.T) {
	fixture := loadCmsFixture(t)
	for _, testCase := range fixture.Cases {
		t.Run(testCase.ID, func(t *testing.T) {
			expect := testCase.Expect
			if profile, ok := testCase.ExpectByProfile["unsigned_u64"]; ok {
				expect = profile
			}
			var endpoint string
			var client *http.Client
			if testCase.Input.Kind == "http" {
				body := fixtureBody(t, fixture, testCase.Input.Body)
				endpoint = "http://fixture.invalid/v1/certs"
				client = &http.Client{Transport: responseTransport{status: testCase.Input.Status, body: body, t: t}}
			} else {
				endpoint = "http://fixture.invalid/v1/certs"
				client = &http.Client{Transport: fixtureTransport{phase: testCase.Input.Phase}}
			}

			manager := fixtureManager(t, fixture, testCase.Initial, endpoint, client)
			defer manager.Close()
			err := manager.Sync()
			if expect.Error == nil {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			} else {
				wantCode := strings.SplitN(*expect.Error, "(", 2)[0]
				if got := Code(err); got != wantCode {
					t.Fatalf("error code: got %q, want %q (%v)", got, wantCode, err)
				}
				wantRetry := map[string]RetryClass{"permanent": RetryPermanent, "transient": RetryTransient}[expect.Retry]
				if got := Retry(err); got != wantRetry {
					t.Errorf("retry: got %v, want %v", got, wantRetry)
				}
			}
			assertFixtureState(t, fixture, manager, expect.State)
		})
	}
}

func TestCmsCloseCancelsRequestAndWaits(t *testing.T) {
	started := make(chan struct{})
	fixture := loadCmsFixture(t)
	manager := fixtureManager(t, fixture, "empty", "http://fixture.invalid/v1/certs", &http.Client{Transport: blockingTransport{started: started}})
	done := make(chan error, 1)
	go func() { done <- manager.Sync() }()
	<-started
	manager.Close()
	select {
	case err := <-done:
		if !errors.Is(err, ErrCmsUnreachable) {
			t.Fatalf("got %v, want DAT_CMS_UNREACHABLE", err)
		}
	case <-time.After(time.Second):
		t.Fatal("Close did not cancel and wait for the request")
	}
}

func TestCmsTransportOptionsAndOrigin(t *testing.T) {
	builder := NewDatCmsManagerBuilder()
	if builder.connectTimeout != 5*time.Second || builder.timeout != 15*time.Second {
		t.Fatalf("unexpected defaults: connect=%v total=%v", builder.connectTimeout, builder.timeout)
	}
	builder.ConnectTimeout(0).Timeout(0)
	if builder.connectTimeout != 0 || builder.timeout != 0 {
		t.Fatal("zero must disable timeouts")
	}

	parse := func(raw string) *url.URL {
		u, err := url.Parse(raw)
		if err != nil {
			t.Fatal(err)
		}
		return u
	}
	base := parse("https://example.com")
	if !sameOrigin(base, parse("https://EXAMPLE.com:443/next")) {
		t.Fatal("default and explicit ports should have the same origin")
	}
	if sameOrigin(base, parse("http://example.com/next")) ||
		sameOrigin(base, parse("https://other.example/next")) ||
		sameOrigin(base, parse("https://example.com:444/next")) {
		t.Fatal("cross-origin redirect was accepted")
	}
}
