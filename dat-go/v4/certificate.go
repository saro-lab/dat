package dat

import (
	"bytes"
	"strconv"
	"strings"
)

type Certificate struct {
	Cid                     uint64
	cidPreCopy              string
	SignatureKey            *Signature
	CryptoKey               *Crypto
	DatIssuanceStartSeconds uint64
	DatIssuanceEndSeconds   uint64
	DatTtlSeconds           uint64
	expireSeconds           uint64
}

func NewCertificate(cid uint64, datIssuanceStartSeconds, datIssuanceDurationSeconds, datTtlSeconds uint64, signatureKey *Signature, cryptoKey *Crypto) (*Certificate, error) {
	// rust (certificate.rs from) validates the time fields with checked_add only:
	// zero ttl / zero duration are legal, wrapping past u64 is not.
	datIssuanceEndSeconds := datIssuanceStartSeconds + datIssuanceDurationSeconds
	if datIssuanceEndSeconds < datIssuanceStartSeconds {
		return nil, ErrCertMalformed.With("certificate time arithmetic overflowed u64")
	}
	expireSeconds := datIssuanceEndSeconds + datTtlSeconds
	if expireSeconds < datIssuanceEndSeconds {
		return nil, ErrCertMalformed.With("certificate time arithmetic overflowed u64")
	}

	cidPreCopy := "." + ToHexFromU64(cid) + "."

	return &Certificate{
		Cid:                     cid,
		cidPreCopy:              cidPreCopy,
		SignatureKey:            signatureKey,
		CryptoKey:               cryptoKey,
		DatIssuanceStartSeconds: datIssuanceStartSeconds,
		DatIssuanceEndSeconds:   datIssuanceEndSeconds,
		DatTtlSeconds:           datTtlSeconds,
		expireSeconds:           expireSeconds,
	}, nil
}

func GenerateCertificate(cid uint64, datIssuanceStartSeconds, datIssuanceDurationSeconds, datTtlSeconds uint64, signatureAlgorithm SignatureAlgorithm, cryptoAlgorithm CryptoAlgorithm) (*Certificate, error) {
	sk, err := GenerateSignatureKey(signatureAlgorithm)
	if err != nil {
		return nil, err
	}
	ck, err := GenerateCryptoKey(cryptoAlgorithm)
	if err != nil {
		return nil, err
	}
	return NewCertificate(cid, datIssuanceStartSeconds, datIssuanceDurationSeconds, datTtlSeconds, sk, ck)
}

// TryClone deep copies the certificate, so a handed out copy cannot be mutated
// through the manager's live certificate (and vice versa).
func (c *Certificate) TryClone() (*Certificate, error) {
	signatureKey, err := NewSignatureKey(c.SignatureKey.algorithm, bytes.Clone(c.SignatureKey.privateBytes), bytes.Clone(c.SignatureKey.publicBytes))
	if err != nil {
		return nil, err
	}
	cryptoKey, err := NewCryptoKey(c.CryptoKey.algorithm, bytes.Clone(c.CryptoKey.key))
	if err != nil {
		return nil, err
	}
	return &Certificate{
		Cid:                     c.Cid,
		cidPreCopy:              c.cidPreCopy,
		SignatureKey:            signatureKey,
		CryptoKey:               cryptoKey,
		DatIssuanceStartSeconds: c.DatIssuanceStartSeconds,
		DatIssuanceEndSeconds:   c.DatIssuanceEndSeconds,
		DatTtlSeconds:           c.DatTtlSeconds,
		expireSeconds:           c.expireSeconds,
	}, nil
}

func (c *Certificate) Expired() bool {
	return c.expireSeconds < NowUnixTimestamp()
}

func (c *Certificate) Issuable() bool {
	now := NowUnixTimestamp()
	return c.Signable() && now >= c.DatIssuanceStartSeconds && now <= c.DatIssuanceEndSeconds
}

func (c *Certificate) Signable() bool {
	return c.SignatureKey.Signable()
}

func (c *Certificate) SupportVerifyOnly() bool {
	return c.SignatureKey.SupportVerifyOnly()
}

func (c *Certificate) SignatureAlgorithm() SignatureAlgorithm {
	return c.SignatureKey.Algorithm()
}

func (c *Certificate) CryptoAlgorithm() CryptoAlgorithm {
	return c.CryptoKey.Algorithm()
}

func (c *Certificate) Export(verifyOnly bool) (string, error) {
	var sb strings.Builder
	sb.WriteString(ToHexFromU64(c.Cid))
	sb.WriteString(".")
	sb.WriteString(strconv.FormatUint(c.DatIssuanceStartSeconds, 10))
	sb.WriteString(".")
	sb.WriteString(strconv.FormatUint(c.DatIssuanceEndSeconds-c.DatIssuanceStartSeconds, 10))
	sb.WriteString(".")
	sb.WriteString(strconv.FormatUint(c.DatTtlSeconds, 10))
	sb.WriteString(".")
	sb.WriteString(string(c.SignatureKey.Algorithm()))
	sb.WriteString(".")
	sb.WriteString(string(c.CryptoKey.Algorithm()))
	sb.WriteString(".")

	key, err := c.SignatureKey.ExportKeyOption(verifyOnly || !c.Signable())
	if err != nil {
		return "", err
	}

	sb.WriteString(EncodeBase64URL(key))
	sb.WriteString(".")
	sb.WriteString(EncodeBase64URL(c.CryptoKey.ToBytes()))

	return sb.String(), nil
}

func ParseCertificate(format string) (*Certificate, error) {
	parts := strings.Split(format, ".")
	if len(parts) != 8 {
		return nil, ErrCertMalformed.With("expected exactly 8 dot-separated fields")
	}

	cid, err := strconv.ParseUint(parts[0], 16, 64)
	if err != nil {
		return nil, ErrCertMalformed.With("cid field is not a plain hex u64")
	}

	datIssuanceStartSeconds, err := strconv.ParseUint(parts[1], 10, 64)
	if err != nil {
		return nil, ErrCertMalformed.With("certificate field is not a plain decimal u64")
	}

	datIssuanceDurationSeconds, err := strconv.ParseUint(parts[2], 10, 64)
	if err != nil {
		return nil, ErrCertMalformed.With("certificate field is not a plain decimal u64")
	}

	datTtlSeconds, err := strconv.ParseUint(parts[3], 10, 64)
	if err != nil {
		return nil, ErrCertMalformed.With("certificate field is not a plain decimal u64")
	}

	sigAlgo := SignatureAlgorithm(parts[4])
	sigKeyBytes, err := DecodeBase64URL(parts[6])
	if err != nil {
		return nil, err
	}

	signatureKey, err := NewSignatureKey(sigAlgo, sigKeyBytes, nil)
	if err != nil {
		// Try treating as public key if it failed?
		signatureKey, err = NewSignatureKey(sigAlgo, nil, sigKeyBytes)
		if err != nil {
			return nil, err
		}
	}

	cryptoAlgo := CryptoAlgorithm(parts[5])
	cryptoKeyBytes, err := DecodeBase64URL(parts[7])
	if err != nil {
		return nil, err
	}
	cryptoKey, err := NewCryptoKey(cryptoAlgo, cryptoKeyBytes)
	if err != nil {
		return nil, err
	}

	return NewCertificate(cid, datIssuanceStartSeconds, datIssuanceDurationSeconds, datTtlSeconds, signatureKey, cryptoKey)
}
