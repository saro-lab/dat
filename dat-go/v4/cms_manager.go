package dat

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const CmsApiVersion = "v1"

type CmsManager struct {
	url     string
	token   string
	version atomic.Uint64
	manager *Manager
	client  *http.Client
	cancel  context.CancelFunc
	syncMu  sync.Mutex
	logger  *slog.Logger

	lastError atomic.Value
}

type lastSyncError struct{ err error }

type CmsManagerBuilder struct {
	rawUrl     string
	token      string
	verifyOnly bool
	interval   time.Duration
	logger     *slog.Logger
}

func NewDatCmsManagerBuilder() *CmsManagerBuilder {
	return &CmsManagerBuilder{
		rawUrl:   "http://localhost:8088",
		interval: 60 * time.Second,
		logger:   slog.Default(),
	}
}

func (b *CmsManagerBuilder) Url(rawUrl string) (*CmsManagerBuilder, error) {
	u, err := url.Parse(rawUrl)
	if err != nil {
		return nil, ErrConfigUriInvalid.With("cannot be parsed as a uri")
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, ErrConfigUriInvalid.With("scheme must be http or https")
	}
	if u.Path != "" && u.Path != "/" {
		return nil, ErrConfigUriInvalid.With("must be path-less\nhttp://localhost:8080 (O)\nhttp://localhost:8080/abc (X)")
	}
	if u.RawQuery != "" {
		return nil, ErrConfigUriInvalid.With("must be query-less\nhttp://localhost:8080 (O)\nhttp://localhost:8080/?query=1 (X)")
	}
	b.rawUrl = strings.TrimRight(rawUrl, "/")
	return b, nil
}

func (b *CmsManagerBuilder) Token(token string) *CmsManagerBuilder {
	b.token = token
	return b
}

func (b *CmsManagerBuilder) VerifyOnly(verifyOnly bool) *CmsManagerBuilder {
	b.verifyOnly = verifyOnly
	return b
}

func (b *CmsManagerBuilder) Interval(interval time.Duration) *CmsManagerBuilder {
	b.interval = interval
	return b
}

func (b *CmsManagerBuilder) IntervalOff() *CmsManagerBuilder {
	return b.Interval(0)
}

func (b *CmsManagerBuilder) Logger(logger *slog.Logger) *CmsManagerBuilder {
	if logger != nil {
		b.logger = logger
	}
	return b
}

func (b *CmsManagerBuilder) Build() (*CmsManager, error) {
	apiUrl := ""
	if b.verifyOnly {
		apiUrl = fmt.Sprintf("%s/%s/certs/verify-only", b.rawUrl, CmsApiVersion)
	} else {
		apiUrl = fmt.Sprintf("%s/%s/certs", b.rawUrl, CmsApiVersion)
	}

	ctx, cancel := context.WithCancel(context.Background())
	m := &CmsManager{
		url:     apiUrl,
		token:   b.token,
		manager: NewManager(),
		client:  &http.Client{Timeout: 10 * time.Second},
		cancel:  cancel,
		logger:  b.logger,
	}

	m.lastError.Store(lastSyncError{ErrCmsNotSynced})

	_ = m.Sync()

	if b.interval > 0 {
		go m.startBackgroundSync(ctx, b.interval)
	} else {
		m.logger.Debug("cms auto sync disabled")
	}

	return m, nil
}

func (m *CmsManager) startBackgroundSync(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			_ = m.Sync()
		}
	}
}

func (m *CmsManager) LastError() error {
	if v, ok := m.lastError.Load().(lastSyncError); ok {
		return v.err
	}
	return nil
}

func (m *CmsManager) Sync() error {
	err := m.sync()
	switch {
	case err == nil:
		m.lastError.Store(lastSyncError{nil})
	case Retry(err) == RetryState:
	default:
		m.lastError.Store(lastSyncError{err})
	}
	return err
}

func (m *CmsManager) sync() error {
	if !m.syncMu.TryLock() {
		m.logger.Debug("cms sync skipped, previous sync still running", "url", m.url)
		return ErrCmsSyncInProgress
	}
	defer m.syncMu.Unlock()

	version := m.version.Load()

	req, err := http.NewRequest("GET", m.url, nil)
	if err != nil {
		return m.logged(ErrConfigUriInvalid.Wrap(err))
	}
	q := req.URL.Query()
	q.Add("version", strconv.FormatUint(version, 10))
	req.URL.RawQuery = q.Encode()
	req.Header.Add("Authorization", m.token)

	resp, err := m.client.Do(req)
	if err != nil {
		return m.logged(ErrCmsUnreachable.Wrap(err))
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return m.logged(httpStatusError(resp.StatusCode))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return m.logged(ErrCmsUnreachable.Wrap(err))
	}

	certStr := string(body)
	parts := strings.SplitN(certStr, "\n", 2)
	if len(parts) == 0 || parts[0] == "" {
		return m.logged(ErrCmsMalformed.With("response has no version line"))
	}

	verStr := parts[0]
	certs := ""
	if len(parts) > 1 {
		certs = strings.TrimSpace(parts[1])
	}

	if certs == "" {
		m.logger.Debug("no new certificates in response", "url", m.url, "version", version)
		return nil
	}

	ver, err := strconv.ParseUint(verStr, 10, 64)
	if err != nil {
		return m.logged(ErrCmsMalformed.With("version line is not a plain decimal u64"))
	}

	if ver < version {
		m.logger.Warn(CodeCmsVersionReset, "url", m.url, "from", version, "to", ver)
	}

	count, err := m.manager.Import(certs, false)
	if err != nil {
		return m.logged(ErrCmsImportFailed.Wrap(err))
	}

	m.version.Store(ver)
	m.logger.Info("Sync OK: Renew DAT certificates.", "count", count)
	return nil
}

func httpStatusError(status int) error {
	switch {
	case status == http.StatusUnauthorized:
		return ErrCmsUnauthorized
	case status == http.StatusForbidden:
		return ErrCmsForbidden
	case status == http.StatusNotFound:
		return ErrCmsEndpointNotFound
	case status >= 500 && status <= 599:
		return ErrCmsServerError.With(fmt.Sprintf("http %d", status))
	default:
		return ErrCmsHttpStatus.With(fmt.Sprintf("http %d", status))
	}
}

func (m *CmsManager) logged(err error) error {
	m.logger.Error("[CRITICAL] DAT CMS SYNC", "url", m.url, "code", Code(err), "error", err)
	return err
}

func (m *CmsManager) Issue(plain string, secure string) (string, error) {
	return m.manager.Issue(plain, secure)
}

func (m *CmsManager) Parse(datStr string) (Payload, error) {
	return m.manager.Parse(datStr)
}

func (m *CmsManager) ParseDat(dat *Dat) (Payload, error) {
	return m.manager.ParseDat(dat)
}

func (m *CmsManager) ParseWithoutVerify(datStr string) (Payload, error) {
	return m.manager.ParseWithoutVerify(datStr)
}

func (m *CmsManager) ParseDatWithoutVerify(dat *Dat) (Payload, error) {
	return m.manager.ParseDatWithoutVerify(dat)
}

func (m *CmsManager) GetManager() *Manager {
	return m.manager
}

func (m *CmsManager) GetVersion() uint64 {
	return m.version.Load()
}

func (m *CmsManager) Close() {
	if m.cancel != nil {
		m.cancel()
	}
}
