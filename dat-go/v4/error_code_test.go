package dat_test

import (
	"strconv"
	"strings"
	"testing"

	"github.com/saro-lab/dat/dat-go/v4"
)

// 오류 코드 회귀 안전망 (error.pre2.md).
//
// 단언하는 것은 "실패했다"가 아니라 **어느 코드로 실패했다** 이다 — 재매핑 사고는
// 전자로는 절대 안 잡힌다. 이 체계를 만든 세 가지 이유를 고정한다:
//
//  1. 만료 / 형식 오류 / 서명 위조가 갈리는가
//  2. 서명 불일치 / 백엔드 실패가 갈리는가
//  3. "발급할 인증서 없음"의 다섯 가지 사유가 갈리는가

const (
	sigAlg    = dat.EcdsaP256
	cryptoAlg = dat.IvAes256Gcm
)

func issuableManager(t *testing.T, cid uint64) *dat.Manager {
	t.Helper()
	now := dat.NowUnixTimestamp()
	cert, err := dat.GenerateCertificate(cid, now-10, 200, 100, sigAlg, cryptoAlg)
	if err != nil {
		t.Fatalf("generate certificate: %v", err)
	}
	m := dat.NewManager()
	if _, err := m.ImportCertificates([]*dat.Certificate{cert}, true); err != nil {
		t.Fatalf("import: %v", err)
	}
	return m
}

func wantCode(t *testing.T, err error, want string) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected %s, got nil", want)
	}
	if got := dat.Code(err); got != want {
		t.Fatalf("expected %s, got %s (%v)", want, got, err)
	}
}

// withExpire 는 토큰의 expire 필드만 갈아 끼운다. 나머지 구조는 그대로다.
func withExpire(token string, expire uint64) string {
	rest := token[strings.Index(token, ".")+1:]
	return strconv.FormatUint(expire, 10) + "." + rest
}

// ---- 1. 만료 / 형식 오류 / 서명 위조 ----

func TestExpiredTokenIsNotMalformed(t *testing.T) {
	m := issuableManager(t, 1)
	token, err := m.Issue("p", "s")
	if err != nil {
		t.Fatal(err)
	}

	_, err = m.Parse(withExpire(token, dat.NowUnixTimestamp()-1))
	wantCode(t, err, dat.CodeTokenExpired)

	// 정각도 만료다 (interop: expire > now 여야 유효).
	_, err = m.Parse(withExpire(token, dat.NowUnixTimestamp()))
	wantCode(t, err, dat.CodeTokenExpired)
}

func TestMalformedTokenShapes(t *testing.T) {
	m := issuableManager(t, 1)
	token, err := m.Issue("p", "s")
	if err != nil {
		t.Fatal(err)
	}
	parts := strings.Split(token, ".")

	// 파트 수 부족
	_, err = m.Parse("1.2.3")
	wantCode(t, err, dat.CodeTokenMalformed)

	// 파트 수 초과
	_, err = m.Parse(token + ".extra")
	wantCode(t, err, dat.CodeTokenMalformed)

	// expire 가 10진수가 아님 — 만료가 아니라 형식 오류다
	_, err = m.Parse("+" + token)
	wantCode(t, err, dat.CodeTokenMalformed)

	// cid 가 16진수가 아님
	_, err = m.Parse(parts[0] + ".zz." + strings.Join(parts[2:], "."))
	wantCode(t, err, dat.CodeTokenMalformed)
}

func TestEmptySignatureIsSigMalformed(t *testing.T) {
	m := issuableManager(t, 1)
	token, err := m.Issue("p", "s")
	if err != nil {
		t.Fatal(err)
	}
	parts := strings.Split(token, ".")

	_, err = m.Parse(strings.Join(parts[:4], ".") + ".")
	wantCode(t, err, dat.CodeSigMalformed)
}

func TestForgedSignatureIsSigMismatch(t *testing.T) {
	// 같은 cid 를 다른 키로 발급하면 서명만 안 맞는다.
	victim := issuableManager(t, 7)
	attacker := issuableManager(t, 7)

	forged, err := attacker.Issue("p", "s")
	if err != nil {
		t.Fatal(err)
	}

	_, err = victim.Parse(forged)
	wantCode(t, err, dat.CodeSigMismatch)
	if !dat.SecurityEvent(err) {
		t.Fatal("위조는 보안 이벤트로 표시되어야 한다")
	}
	if dat.IsCritical(err) {
		t.Fatal("클라이언트가 나쁜 토큰을 낸 것은 critical 이 아니다")
	}
}

func TestTamperedSecureIsCryptoTagMismatch(t *testing.T) {
	// 서명 검증을 건너뛰는 경로에서는 GCM 태그가 유일한 무결성 검사다.
	m := issuableManager(t, 1)
	token, err := m.Issue("plain", "secure-payload")
	if err != nil {
		t.Fatal(err)
	}
	parts := strings.Split(token, ".")

	secure := parts[3]
	last := secure[len(secure)-1]
	flipped := byte('A')
	if last == 'A' {
		flipped = 'B'
	}
	parts[3] = secure[:len(secure)-1] + string(flipped)

	_, err = m.ParseWithoutVerify(strings.Join(parts, "."))
	wantCode(t, err, dat.CodeCryptoTagMismatch)
	if !dat.SecurityEvent(err) {
		t.Fatal("변조는 보안 이벤트로 표시되어야 한다")
	}
}

// ---- 2. 인증서 ----

func TestUnknownCidIsCertNotFound(t *testing.T) {
	m := issuableManager(t, 1)
	other := issuableManager(t, 999)

	token, err := other.Issue("p", "s")
	if err != nil {
		t.Fatal(err)
	}

	_, err = m.Parse(token)
	wantCode(t, err, dat.CodeCertNotFound)
}

func TestDuplicateCidOnImport(t *testing.T) {
	now := dat.NowUnixTimestamp()
	a, err := dat.GenerateCertificate(5, now-10, 200, 100, sigAlg, cryptoAlg)
	if err != nil {
		t.Fatal(err)
	}
	b, err := dat.GenerateCertificate(5, now-10, 200, 100, sigAlg, cryptoAlg)
	if err != nil {
		t.Fatal(err)
	}

	_, err = dat.NewManager().ImportCertificates([]*dat.Certificate{a, b}, true)
	wantCode(t, err, dat.CodeCertDuplicateCid)
}

func TestMalformedCertificateShapes(t *testing.T) {
	// 파트 수 부족
	_, err := dat.ParseCertificate("a.b.c")
	wantCode(t, err, dat.CodeCertMalformed)

	// 8 파트지만 cid 가 16진수가 아님. 예전에는 이 자리만 ErrInvalidDat 였고,
	// 그래서 IsCritical 판정이 양방향으로 오작동했다.
	_, err = dat.ParseCertificate("zz.1.2.3.ECDSA-P256.IV-AES256-GCM.AAAA.AAAA")
	wantCode(t, err, dat.CodeCertMalformed)
	if !dat.IsCritical(err) {
		t.Fatal("인증서 손상은 critical 이어야 한다")
	}
}

// ---- 3. "발급할 인증서 없음" 다섯 갈래 ----

func TestNoCertificateAtAll(t *testing.T) {
	_, err := dat.NewManager().Issue("p", "s")
	wantCode(t, err, dat.CodeManagerNoCertificate)
	// CMS 접속 문제일 수 있으므로 기다려 볼 값어치가 있다.
	if dat.Retry(err) != dat.RetryTransient {
		t.Fatal("인증서 0건은 일시적이어야 한다")
	}
}

func TestIssuanceWindowNotYetOpenIsTransient(t *testing.T) {
	now := dat.NowUnixTimestamp()
	cert, err := dat.GenerateCertificate(1, now+3600, 200, 100, sigAlg, cryptoAlg)
	if err != nil {
		t.Fatal(err)
	}
	m := dat.NewManager()
	if _, err := m.ImportCertificates([]*dat.Certificate{cert}, true); err != nil {
		t.Fatal(err)
	}

	_, err = m.Issue("p", "s")
	wantCode(t, err, dat.CodeManagerNoIssuableCertificate)
	if !errors.Is(err, dat.ErrCertNotYetIssuable) {
		t.Fatalf("사유가 DAT_CERT_NOT_YET_ISSUABLE 이어야 한다: %v", err)
	}
	// 기다리면 풀리는 유일한 사유다.
	if dat.Retry(err) != dat.RetryTransient {
		t.Fatal("발급창 시작 전은 일시적이어야 한다")
	}
}

func TestIssuanceWindowClosedIsPermanent(t *testing.T) {
	now := dat.NowUnixTimestamp()
	// 발급창은 닫혔지만 ttl 이 남아 검증은 된다.
	cert, err := dat.GenerateCertificate(1, now-500, 100, 3600, sigAlg, cryptoAlg)
	if err != nil {
		t.Fatal(err)
	}
	m := dat.NewManager()
	if _, err := m.ImportCertificates([]*dat.Certificate{cert}, true); err != nil {
		t.Fatal(err)
	}

	_, err = m.Issue("p", "s")
	wantCode(t, err, dat.CodeManagerNoIssuableCertificate)
	if !errors.Is(err, dat.ErrCertIssuanceEnded) {
		t.Fatalf("사유가 DAT_CERT_ISSUANCE_ENDED 이어야 한다: %v", err)
	}
	if dat.Retry(err) != dat.RetryPermanent {
		t.Fatal("발급창 종료는 영구여야 한다")
	}
}

func TestVerifyOnlyCertificateCannotIssue(t *testing.T) {
	now := dat.NowUnixTimestamp()
	source, err := dat.GenerateCertificate(1, now-10, 200, 100, sigAlg, cryptoAlg)
	if err != nil {
		t.Fatal(err)
	}
	exported, err := source.Export(true)
	if err != nil {
		t.Fatal(err)
	}
	verifyOnly, err := dat.ParseCertificate(exported)
	if err != nil {
		t.Fatal(err)
	}

	m := dat.NewManager()
	if _, err := m.ImportCertificates([]*dat.Certificate{verifyOnly}, true); err != nil {
		t.Fatal(err)
	}

	_, err = m.Issue("p", "s")
	wantCode(t, err, dat.CodeManagerNoIssuableCertificate)
	// 배포 설정 실수다 — 기다려도 안 풀린다.
	if !errors.Is(err, dat.ErrCertVerifyOnly) {
		t.Fatalf("사유가 DAT_CERT_VERIFY_ONLY 이어야 한다: %v", err)
	}
	if dat.Retry(err) != dat.RetryPermanent {
		t.Fatal("verify-only 는 영구여야 한다")
	}
}

// ---- 키 · 알고리즘 ----

func TestUnknownAlgorithmNames(t *testing.T) {
	_, err := dat.GenerateSignatureKey(dat.SignatureAlgorithm("NOPE"))
	wantCode(t, err, dat.CodeConfigAlgUnsupported)

	_, err = dat.GenerateCryptoKey(dat.CryptoAlgorithm("NOPE"))
	wantCode(t, err, dat.CodeConfigAlgUnsupported)
}

func TestWrongKeySizeIsKeyInvalid(t *testing.T) {
	_, err := dat.NewCryptoKey(cryptoAlg, make([]byte, 7))
	wantCode(t, err, dat.CodeKeyInvalid)

	_, err = dat.NewSignatureKey(dat.HmacSha256Mfs, make([]byte, 7), nil)
	wantCode(t, err, dat.CodeKeyInvalid)
}

func TestHmacVerifyOnlyExportIsStructurallyUnsupported(t *testing.T) {
	// 알고리즘의 구조적 한계다. 런타임에 개인키가 없는 SIG_KEY_MISSING 과 다르다.
	sk, err := dat.GenerateSignatureKey(dat.HmacSha256Mfs)
	if err != nil {
		t.Fatal(err)
	}
	_, err = sk.ExportVerifyOnlyKey()
	wantCode(t, err, dat.CodeKeyVerifyOnlyUnsupported)
}

func TestSigningWithVerifyOnlyKeyIsKeyMissing(t *testing.T) {
	source, err := dat.GenerateSignatureKey(sigAlg)
	if err != nil {
		t.Fatal(err)
	}
	pub, err := source.ExportVerifyOnlyKey()
	if err != nil {
		t.Fatal(err)
	}
	verifyOnly, err := dat.NewSignatureKey(sigAlg, nil, pub)
	if err != nil {
		t.Fatal(err)
	}

	_, err = verifyOnly.Sign([]byte("body"))
	wantCode(t, err, dat.CodeSigKeyMissing)
}

func TestCiphertextShorterThanIv(t *testing.T) {
	ck, err := dat.GenerateCryptoKey(cryptoAlg)
	if err != nil {
		t.Fatal(err)
	}
	_, err = ck.Decrypt(make([]byte, 5))
	wantCode(t, err, dat.CodeCryptoDataInvalid)
}

func TestEmptySecurePayloadIsNotAnError(t *testing.T) {
	// 빈 입력 → 빈 출력. 모든 공식 클라이언트 공통이며 어떤 코드도 내지 않는다.
	ck, err := dat.GenerateCryptoKey(cryptoAlg)
	if err != nil {
		t.Fatal(err)
	}
	enc, err := ck.Encrypt(nil)
	if err != nil || len(enc) != 0 {
		t.Fatalf("빈 입력은 빈 출력이어야 한다: %v %v", enc, err)
	}
	dec, err := ck.Decrypt(nil)
	if err != nil || len(dec) != 0 {
		t.Fatalf("빈 입력은 빈 출력이어야 한다: %v %v", dec, err)
	}
}

// ---- 코드 체계 자체의 불변식 ----

func TestCodesAreWellFormed(t *testing.T) {
	samples := []error{
		dat.ErrTokenMalformed, dat.ErrTokenExpired, dat.ErrCertExpired,
		dat.ErrCertNotSynced, dat.ErrSigMismatch, dat.ErrCryptoTagMismatch,
		dat.ErrKeyInvalid, dat.ErrManagerNoCertificate, dat.ErrCmsUnauthorized,
		dat.ErrCmsSyncInProgress, dat.ErrConfigAlgUnsupported, dat.ErrInternalUnavailable,
	}
	for _, e := range samples {
		code := dat.Code(e)
		if !strings.HasPrefix(code, "DAT_") {
			t.Fatalf("%s must start with DAT_", code)
		}
		for _, c := range code {
			if !(c >= 'A' && c <= 'Z') && c != '_' {
				t.Fatalf("%s must be SCREAMING_SNAKE_CASE", code)
			}
		}
		// 메시지가 아니라 코드가 Error() 의 머리에 온다.
		if !strings.HasPrefix(e.Error(), code) {
			t.Fatalf("%q must start with %s", e.Error(), code)
		}
	}
}

func TestSentinelMatchingSurvivesDetail(t *testing.T) {
	// 같은 코드면 Detail 이 달라도 errors.Is 로 잡혀야 한다.
	withDetail := dat.ErrTokenMalformed.With("cid field is not a plain hex u64")
	if !errors.Is(withDetail, dat.ErrTokenMalformed) {
		t.Fatal("Detail 이 붙어도 센티널 대조가 되어야 한다")
	}
	if errors.Is(withDetail, dat.ErrTokenExpired) {
		t.Fatal("다른 코드와 같다고 판정하면 안 된다")
	}
}

func TestCauseChainIsPreserved(t *testing.T) {
	wrapped := dat.ErrCmsImportFailed.Wrap(dat.ErrCertMalformed.With("bad field"))
	if dat.Code(wrapped) != dat.CodeCmsImportFailed {
		t.Fatalf("바깥 코드가 유지되어야 한다: %s", dat.Code(wrapped))
	}
	if !errors.Is(wrapped, dat.ErrCertMalformed) {
		t.Fatal("하위 원인을 버리면 안 된다")
	}
}

func TestRetryClassification(t *testing.T) {
	// 401 에 60초마다 영원히 재시도하던 것이 이 분류의 존재 이유다.
	for _, e := range []error{dat.ErrCmsUnauthorized, dat.ErrCmsForbidden, dat.ErrCmsEndpointNotFound} {
		if dat.Retry(e) != dat.RetryPermanent {
			t.Fatalf("%s must be permanent", dat.Code(e))
		}
	}
	for _, e := range []error{dat.ErrCmsUnreachable, dat.ErrCmsServerError, dat.ErrCmsNotSynced} {
		if dat.Retry(e) != dat.RetryTransient {
			t.Fatalf("%s must be transient", dat.Code(e))
		}
	}
	for _, e := range []error{dat.ErrCmsSyncInProgress, dat.ErrCmsVersionReset} {
		if dat.Retry(e) != dat.RetryState {
			t.Fatalf("%s must be a state signal", dat.Code(e))
		}
	}
}
