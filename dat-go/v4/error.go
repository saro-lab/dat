package dat

import "errors"

const (
	CodeTokenMalformed = "DAT_TOKEN_MALFORMED"
	CodeTokenExpired   = "DAT_TOKEN_EXPIRED"
	CodeTokenUnknown   = "DAT_TOKEN_UNKNOWN"

	CodeCertMalformed      = "DAT_CERT_MALFORMED"
	CodeCertExpired        = "DAT_CERT_EXPIRED"
	CodeCertNotYetIssuable = "DAT_CERT_NOT_YET_ISSUABLE"
	CodeCertIssuanceEnded  = "DAT_CERT_ISSUANCE_ENDED"
	CodeCertVerifyOnly     = "DAT_CERT_VERIFY_ONLY"
	CodeCertNotFound       = "DAT_CERT_NOT_FOUND"
	CodeCertNotSynced      = "DAT_CERT_NOT_SYNCED"
	CodeCertDuplicateCid   = "DAT_CERT_DUPLICATE_CID"
	CodeCertUnknown        = "DAT_CERT_UNKNOWN"

	CodeSigMismatch   = "DAT_SIG_MISMATCH"
	CodeSigMalformed  = "DAT_SIG_MALFORMED"
	CodeSigKeyMissing = "DAT_SIG_KEY_MISSING"
	CodeSigBackend    = "DAT_SIG_BACKEND"
	CodeSigUnknown    = "DAT_SIG_UNKNOWN"

	CodeCryptoTagMismatch = "DAT_CRYPTO_TAG_MISMATCH"
	CodeCryptoDataInvalid = "DAT_CRYPTO_DATA_INVALID"
	CodeCryptoBackend     = "DAT_CRYPTO_BACKEND"
	CodeCryptoUnknown     = "DAT_CRYPTO_UNKNOWN"

	CodeKeyInvalid               = "DAT_KEY_INVALID"
	CodeKeyVerifyOnlyUnsupported = "DAT_KEY_VERIFY_ONLY_UNSUPPORTED"
	CodeKeyUnknown               = "DAT_KEY_UNKNOWN"

	CodeManagerNoCertificate         = "DAT_MANAGER_NO_CERTIFICATE"
	CodeManagerNoIssuableCertificate = "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE"
	CodeManagerDisposed              = "DAT_MANAGER_DISPOSED"
	CodeManagerUnknown               = "DAT_MANAGER_UNKNOWN"

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

	CodeConfigAlgUnsupported  = "DAT_CONFIG_ALG_UNSUPPORTED"
	CodeConfigUriInvalid      = "DAT_CONFIG_URI_INVALID"
	CodeConfigArgumentInvalid = "DAT_CONFIG_ARGUMENT_INVALID"
	CodeConfigUnknown         = "DAT_CONFIG_UNKNOWN"

	CodeInternalUnavailable = "DAT_INTERNAL_UNAVAILABLE"
	CodeInternalUnknown     = "DAT_INTERNAL_UNKNOWN"
)

type RetryClass int

const (
	RetryPermanent RetryClass = iota

	RetryTransient

	RetryState
)

type Error struct {
	Code string

	Detail string

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

func (e *Error) Is(target error) bool {
	t, ok := target.(*Error)
	return ok && t.Code == e.Code
}

func (e *Error) With(detail string) *Error {
	return &Error{Code: e.Code, Detail: detail, Cause: e.Cause}
}

func (e *Error) Wrap(cause error) *Error {
	return &Error{Code: e.Code, Detail: e.Detail, Cause: cause}
}

func (e *Error) Retry() RetryClass {
	switch e.Code {
	case CodeCertNotYetIssuable, CodeCertNotSynced, CodeManagerNoCertificate,
		CodeCmsUnreachable, CodeCmsServerError, CodeCmsNotSynced:
		return RetryTransient
	case CodeCmsVersionReset, CodeCmsSyncInProgress:
		return RetryState
	case CodeManagerNoIssuableCertificate:

		if errors.Is(e.Cause, ErrCertNotYetIssuable) {
			return RetryTransient
		}
		return RetryPermanent
	}
	return RetryPermanent
}

func (e *Error) SecurityEvent() bool {
	return e.Code == CodeSigMismatch || e.Code == CodeCryptoTagMismatch
}

func (e *Error) IsCritical() bool {
	switch e.Code {
	case CodeTokenMalformed, CodeTokenExpired, CodeSigMismatch, CodeSigMalformed,
		CodeCryptoTagMismatch, CodeCryptoDataInvalid, CodeCertNotFound, CodeCertNotSynced:
		return false
	}
	return true
}

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

func Code(err error) string {
	var e *Error
	if errors.As(err, &e) {
		return e.Code
	}
	return ""
}

func Retry(err error) RetryClass {
	var e *Error
	if errors.As(err, &e) {
		return e.Retry()
	}
	return RetryPermanent
}

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
