package dat

import "errors"

type Error string

func (e Error) Error() string { return string(e) }

const (
	ErrInvalidCertificateFormat     Error = "InvalidCertificateFormat"
	ErrUnknownSignatureAlgorithm    Error = "UnknownSignatureAlgorithm"
	ErrNotSupportedVerifyOnly       Error = "NotSupportedVerifyOnly"
	ErrUnknownCryptoAlgorithm       Error = "UnknownCryptoAlgorithm"
	ErrInvalidSignatureKey          Error = "InvalidSignatureKey"
	ErrInvalidCryptoKey             Error = "InvalidCryptoKey"
	ErrGenerateSigningKeyError      Error = "GenerateSigningKeyError"
	ErrNotExistsSigningKey          Error = "NotExistsSigningKey"
	ErrVerifyOnlyKeyIsPairKeyOption Error = "VerifyOnlyKeyIsPairKeyOption"
	ErrEncryptError                 Error = "EncryptError"
	ErrDecryptError                 Error = "DecryptError"
	ErrSignError                    Error = "SignError"
	ErrCidNotFound                  Error = "CidNotFound"
	ErrInvalidDatTtl                Error = "InvalidDatTtl"
	ErrInvalidIssuanceDuration      Error = "InvalidIssuanceDuration"
	ErrSigningKeyNotExists          Error = "SigningKeyNotExists"
	ErrDuplicatedCid                Error = "DuplicatedCid"
	ErrInvalidBase64Format          Error = "InvalidBase64Format"
	ErrUtf8EncodeError              Error = "Utf8EncodeError"
	ErrIoError                      Error = "IoError"
	ErrInvalidDat                   Error = "InvalidDat"
)

func (e Error) IsCritical() bool {
	return !errors.Is(e, ErrInvalidDat)
}

func IsCritical(err error) bool {
	if err == nil {
		return false
	}
	var e Error
	if errors.As(err, &e) {
		return e.IsCritical()
	}
	return true
}
