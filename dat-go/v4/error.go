package dat

import "errors"

// DAT 통합 오류 코드 (error.pre2.md).
//
// 코드 문자열은 모든 공식 클라이언트와 CMS 서버가 공유하는 공개 계약이다. Detail 은 자유롭게 바꿔도 되지만
// Code 는 바꾸지 않는다.
//
//   - 분류는 원인이다. "어느 함수에서 났는가"가 아니라 "무엇이 잘못됐는가"다.
//   - *_UNKNOWN 은 각 영역의 폴백 전용이다. "알 수 없는 X" 라는 뜻으로 쓰지 않는다.
//   - 하위 원인은 버리지 않고 Cause 로 보존한다. errors.Is / errors.As 가 그대로 동작한다.
const (
	// TOKEN : DAT 토큰 문자열
	CodeTokenMalformed = "DAT_TOKEN_MALFORMED"
	CodeTokenExpired   = "DAT_TOKEN_EXPIRED"
	CodeTokenUnknown   = "DAT_TOKEN_UNKNOWN"

	// CERT : 인증서
	CodeCertMalformed      = "DAT_CERT_MALFORMED"
	CodeCertExpired        = "DAT_CERT_EXPIRED"
	CodeCertNotYetIssuable = "DAT_CERT_NOT_YET_ISSUABLE"
	CodeCertIssuanceEnded  = "DAT_CERT_ISSUANCE_ENDED"
	CodeCertVerifyOnly     = "DAT_CERT_VERIFY_ONLY"
	CodeCertNotFound       = "DAT_CERT_NOT_FOUND"
	CodeCertNotSynced      = "DAT_CERT_NOT_SYNCED"
	CodeCertDuplicateCid   = "DAT_CERT_DUPLICATE_CID"
	CodeCertUnknown        = "DAT_CERT_UNKNOWN"

	// SIG : 서명
	CodeSigMismatch   = "DAT_SIG_MISMATCH"
	CodeSigMalformed  = "DAT_SIG_MALFORMED"
	CodeSigKeyMissing = "DAT_SIG_KEY_MISSING"
	CodeSigBackend    = "DAT_SIG_BACKEND"
	CodeSigUnknown    = "DAT_SIG_UNKNOWN"

	// CRYPTO : secure 페이로드
	CodeCryptoTagMismatch = "DAT_CRYPTO_TAG_MISMATCH"
	CodeCryptoDataInvalid = "DAT_CRYPTO_DATA_INVALID"
	CodeCryptoBackend     = "DAT_CRYPTO_BACKEND"
	CodeCryptoUnknown     = "DAT_CRYPTO_UNKNOWN"

	// KEY : 키 재료
	CodeKeyInvalid               = "DAT_KEY_INVALID"
	CodeKeyVerifyOnlyUnsupported = "DAT_KEY_VERIFY_ONLY_UNSUPPORTED"
	CodeKeyUnknown               = "DAT_KEY_UNKNOWN"

	// MANAGER : 매니저 보유 상태
	CodeManagerNoCertificate         = "DAT_MANAGER_NO_CERTIFICATE"
	CodeManagerNoIssuableCertificate = "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE"
	CodeManagerDisposed              = "DAT_MANAGER_DISPOSED"
	CodeManagerUnknown               = "DAT_MANAGER_UNKNOWN"

	// CMS : 서버 응답·전송
	CodeCmsUnreachable      = "DAT_CMS_UNREACHABLE"
	CodeCmsUnauthorized     = "DAT_CMS_UNAUTHORIZED"
	CodeCmsForbidden        = "DAT_CMS_FORBIDDEN"
	CodeCmsEndpointNotFound = "DAT_CMS_ENDPOINT_NOT_FOUND"
	CodeCmsServerError      = "DAT_CMS_SERVER_ERROR"
	CodeCmsHttpStatus       = "DAT_CMS_HTTP_STATUS"
	CodeCmsMalformed        = "DAT_CMS_MALFORMED"
	CodeCmsImportFailed     = "DAT_CMS_IMPORT_FAILED"
	CodeCmsVersionReset     = "DAT_CMS_VERSION_RESET"
	CodeCmsNotSynced        = "DAT_CMS_NOT_SYNCED"
	CodeCmsSyncInProgress   = "DAT_CMS_SYNC_IN_PROGRESS"
	CodeCmsNotSupported     = "DAT_CMS_NOT_SUPPORTED"
	CodeCmsUnknown          = "DAT_CMS_UNKNOWN"

	// CONFIG : 호출자가 넘긴 값
	CodeConfigAlgUnsupported  = "DAT_CONFIG_ALG_UNSUPPORTED"
	CodeConfigUriInvalid      = "DAT_CONFIG_URI_INVALID"
	CodeConfigArgumentInvalid = "DAT_CONFIG_ARGUMENT_INVALID"
	CodeConfigUnknown         = "DAT_CONFIG_UNKNOWN"

	// INTERNAL : 실행 환경
	CodeInternalUnavailable = "DAT_INTERNAL_UNAVAILABLE"
	CodeInternalUnknown     = "DAT_INTERNAL_UNKNOWN"
)

// RetryClass 는 재시도 분류다. 중간값을 두지 않는다 — 호출부가 분기할 수 없기 때문이다.
type RetryClass int

const (
	// RetryPermanent : 설정·입력·배포를 고쳐야 한다. 재시도하지 않는다.
	RetryPermanent RetryClass = iota
	// RetryTransient : 같은 입력으로 재시도하면 해소될 수 있다.
	RetryTransient
	// RetryState : 오류가 아닌 상태 신호. 흐름 제어에만 쓴다.
	RetryState
)

// Error 는 DAT 의 단일 오류 타입이다. 센티널과의 대조는 errors.Is 로 한다.
type Error struct {
	// Code 는 공개 계약이다. 모든 공식 클라이언트에서 동일하다.
	Code string
	// Detail 은 사람이 읽는 설명이다. 자유롭게 바꿔도 된다.
	Detail string
	// Cause 는 하위 원인이다. 체이닝을 버리지 않는다.
	Cause error
}

func (e *Error) Error() string {
	if e == nil {
		return ""
	}
	s := e.Code
	if e.Detail != "" {
		s += ": " + e.Detail
	}
	if e.Cause != nil {
		s += ": " + e.Cause.Error()
	}
	return s
}

func (e *Error) Unwrap() error { return e.Cause }

// Is 는 코드로만 대조한다. 같은 코드면 Detail·Cause 가 달라도 같은 오류다.
// 덕분에 errors.Is(err, ErrTokenExpired) 가 센티널 시절 그대로 동작한다.
func (e *Error) Is(target error) bool {
	t, ok := target.(*Error)
	return ok && t.Code == e.Code
}

// With 는 같은 코드에 설명만 붙인 사본을 만든다. 센티널 자체는 건드리지 않는다.
func (e *Error) With(detail string) *Error {
	return &Error{Code: e.Code, Detail: detail, Cause: e.Cause}
}

// Wrap 은 하위 원인을 매단 사본을 만든다.
func (e *Error) Wrap(cause error) *Error {
	return &Error{Code: e.Code, Detail: e.Detail, Cause: cause}
}

// Retry 는 이 오류를 재시도해도 되는지 알려준다. 애매하면 Permanent 다 —
// 영구 오류에 대한 무한 재시도가 이 체계 이전의 실제 결함이었다.
func (e *Error) Retry() RetryClass {
	switch e.Code {
	case CodeCertNotYetIssuable, CodeCertNotSynced, CodeManagerNoCertificate,
		CodeCmsUnreachable, CodeCmsServerError, CodeCmsNotSynced:
		return RetryTransient
	case CodeCmsVersionReset, CodeCmsSyncInProgress:
		return RetryState
	case CodeManagerNoIssuableCertificate:
		// 발급창 시작 전이면 기다리면 풀린다. 나머지 사유는 안 풀린다.
		if errors.Is(e.Cause, ErrCertNotYetIssuable) {
			return RetryTransient
		}
		return RetryPermanent
	}
	return RetryPermanent
}

// SecurityEvent 는 위조·변조 시도의 직접 증거인지 알려준다.
// 다른 실패와 같은 경로로 로깅하지 않는다.
func (e *Error) SecurityEvent() bool {
	return e.Code == CodeSigMismatch || e.Code == CodeCryptoTagMismatch
}

// IsCritical 은 이 실패가 우리 문제인지 알려준다.
//
// 클라이언트가 나쁜 토큰을 들고 오는 것은 일상이므로 critical 이 아니다.
// 예전에는 판정이 ErrInvalidDat 하나에 걸려 있었고, 인증서 파싱 오류에도 그 값을
// 쓰는 바람에 양방향으로 오작동했다.
func (e *Error) IsCritical() bool {
	switch e.Code {
	case CodeTokenMalformed, CodeTokenExpired, CodeSigMismatch, CodeSigMalformed,
		CodeCryptoTagMismatch, CodeCryptoDataInvalid, CodeCertNotFound, CodeCertNotSynced:
		return false
	}
	return true
}

// 센티널. errors.Is 로 대조하고, 설명이 필요하면 .With(...) 로 사본을 만든다.
var (
	ErrTokenMalformed = &Error{Code: CodeTokenMalformed}
	ErrTokenExpired   = &Error{Code: CodeTokenExpired}
	ErrTokenUnknown   = &Error{Code: CodeTokenUnknown}

	ErrCertMalformed      = &Error{Code: CodeCertMalformed}
	ErrCertExpired        = &Error{Code: CodeCertExpired}
	ErrCertNotYetIssuable = &Error{Code: CodeCertNotYetIssuable}
	ErrCertIssuanceEnded  = &Error{Code: CodeCertIssuanceEnded}
	ErrCertVerifyOnly     = &Error{Code: CodeCertVerifyOnly}
	ErrCertNotFound       = &Error{Code: CodeCertNotFound}
	ErrCertNotSynced      = &Error{Code: CodeCertNotSynced}
	ErrCertDuplicateCid   = &Error{Code: CodeCertDuplicateCid}
	ErrCertUnknown        = &Error{Code: CodeCertUnknown}

	ErrSigMismatch   = &Error{Code: CodeSigMismatch}
	ErrSigMalformed  = &Error{Code: CodeSigMalformed}
	ErrSigKeyMissing = &Error{Code: CodeSigKeyMissing}
	ErrSigBackend    = &Error{Code: CodeSigBackend}
	ErrSigUnknown    = &Error{Code: CodeSigUnknown}

	ErrCryptoTagMismatch = &Error{Code: CodeCryptoTagMismatch}
	ErrCryptoDataInvalid = &Error{Code: CodeCryptoDataInvalid}
	ErrCryptoBackend     = &Error{Code: CodeCryptoBackend}
	ErrCryptoUnknown     = &Error{Code: CodeCryptoUnknown}

	ErrKeyInvalid               = &Error{Code: CodeKeyInvalid}
	ErrKeyVerifyOnlyUnsupported = &Error{Code: CodeKeyVerifyOnlyUnsupported}
	ErrKeyUnknown               = &Error{Code: CodeKeyUnknown}

	ErrManagerNoCertificate         = &Error{Code: CodeManagerNoCertificate}
	ErrManagerNoIssuableCertificate = &Error{Code: CodeManagerNoIssuableCertificate}
	ErrManagerDisposed              = &Error{Code: CodeManagerDisposed}
	ErrManagerUnknown               = &Error{Code: CodeManagerUnknown}

	ErrCmsUnreachable      = &Error{Code: CodeCmsUnreachable}
	ErrCmsUnauthorized     = &Error{Code: CodeCmsUnauthorized}
	ErrCmsForbidden        = &Error{Code: CodeCmsForbidden}
	ErrCmsEndpointNotFound = &Error{Code: CodeCmsEndpointNotFound}
	ErrCmsServerError      = &Error{Code: CodeCmsServerError}
	ErrCmsHttpStatus       = &Error{Code: CodeCmsHttpStatus}
	ErrCmsMalformed        = &Error{Code: CodeCmsMalformed}
	ErrCmsImportFailed     = &Error{Code: CodeCmsImportFailed}
	ErrCmsVersionReset     = &Error{Code: CodeCmsVersionReset}
	ErrCmsNotSynced        = &Error{Code: CodeCmsNotSynced}
	ErrCmsSyncInProgress   = &Error{Code: CodeCmsSyncInProgress}
	ErrCmsNotSupported     = &Error{Code: CodeCmsNotSupported}
	ErrCmsUnknown          = &Error{Code: CodeCmsUnknown}

	ErrConfigAlgUnsupported  = &Error{Code: CodeConfigAlgUnsupported}
	ErrConfigUriInvalid      = &Error{Code: CodeConfigUriInvalid}
	ErrConfigArgumentInvalid = &Error{Code: CodeConfigArgumentInvalid}
	ErrConfigUnknown         = &Error{Code: CodeConfigUnknown}

	ErrInternalUnavailable = &Error{Code: CodeInternalUnavailable}
	ErrInternalUnknown     = &Error{Code: CodeInternalUnknown}
)

// Code 는 어떤 error 에서든 DAT 오류 코드를 꺼낸다. DAT 오류가 아니면 "" 다.
func Code(err error) string {
	var e *Error
	if errors.As(err, &e) {
		return e.Code
	}
	return ""
}

// Retry 는 어떤 error 에서든 재시도 분류를 꺼낸다. DAT 오류가 아니면 Permanent 다.
func Retry(err error) RetryClass {
	var e *Error
	if errors.As(err, &e) {
		return e.Retry()
	}
	return RetryPermanent
}

// SecurityEvent 는 어떤 error 에서든 보안 이벤트 여부를 꺼낸다.
func SecurityEvent(err error) bool {
	var e *Error
	if errors.As(err, &e) {
		return e.SecurityEvent()
	}
	return false
}

func IsCritical(err error) bool {
	if err == nil {
		return false
	}
	var e *Error
	if errors.As(err, &e) {
		return e.IsCritical()
	}
	return true
}
