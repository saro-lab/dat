package dat

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/sha512"
	"hash"
	"math/big"
	"sync"
)

type SignatureAlgorithm string

const (
	HmacSha256Mfs SignatureAlgorithm = "HMAC-SHA256-MFS"
	HmacSha384Mfs SignatureAlgorithm = "HMAC-SHA384-MFS"
	HmacSha512Mfs SignatureAlgorithm = "HMAC-SHA512-MFS"
	EcdsaP256     SignatureAlgorithm = "ECDSA-P256"
	EcdsaP384     SignatureAlgorithm = "ECDSA-P384"
	EcdsaP521     SignatureAlgorithm = "ECDSA-P521"
)

const (
	P256 = EcdsaP256
	P384 = EcdsaP384
	P521 = EcdsaP521
)

type Signature struct {
	algorithm    SignatureAlgorithm
	privateKey   *ecdsa.PrivateKey
	publicKey    *ecdsa.PublicKey
	hmacKey      []byte
	privateBytes []byte
	publicBytes  []byte
	hmacPool     sync.Pool
}

func (sk *Signature) newHash() hash.Hash {
	switch sk.algorithm {
	case HmacSha256Mfs, EcdsaP256:
		return sha256.New()
	case HmacSha384Mfs, EcdsaP384:
		return sha512.New384()
	default:
		return sha512.New()
	}
}

func (sk *Signature) hmacSum(data []byte) []byte {
	mac, _ := sk.hmacPool.Get().(hash.Hash)
	if mac == nil {
		var h func() hash.Hash
		switch sk.algorithm {
		case HmacSha256Mfs:
			h = sha256.New
		case HmacSha384Mfs:
			h = sha512.New384
		default:
			h = sha512.New
		}
		mac = hmac.New(h, sk.hmacKey)
	} else {
		mac.Reset()
	}
	mac.Write(data)
	sum := mac.Sum(nil)
	sk.hmacPool.Put(mac)
	return sum
}

func ecdsaKeyInfo(algorithm SignatureAlgorithm) (elliptic.Curve, int, int) {
	switch algorithm {
	case EcdsaP256:
		return elliptic.P256(), 32, 65
	case EcdsaP384:
		return elliptic.P384(), 48, 97
	case EcdsaP521:
		return elliptic.P521(), 66, 133
	default:
		return nil, 0, 0
	}
}

func NewSignatureKey(algorithm SignatureAlgorithm, privateBytes, publicBytes []byte) (*Signature, error) {
	switch algorithm {
	case HmacSha256Mfs, HmacSha384Mfs, HmacSha512Mfs:
		size := 0
		switch algorithm {
		case HmacSha256Mfs:
			size = 32
		case HmacSha384Mfs:
			size = 48
		case HmacSha512Mfs:
			size = 64
		}
		if len(privateBytes) != size {
			return nil, ErrKeyInvalid.With("signature key material rejected")
		}
		return &Signature{
			algorithm:    algorithm,
			hmacKey:      privateBytes,
			privateBytes: privateBytes,
			publicBytes:  privateBytes,
		}, nil
	case EcdsaP256, EcdsaP384, EcdsaP521:
		curve, privateLen, publicLen := ecdsaKeyInfo(algorithm)

		if len(privateBytes) == privateLen+publicLen {
			publicBytes = privateBytes[privateLen:]
			privateBytes = privateBytes[:privateLen]
		}

		sk := &Signature{
			algorithm: algorithm,
		}

		switch {
		case len(privateBytes) == privateLen:

			priv, err := ecdsa.ParseRawPrivateKey(curve, privateBytes)
			if err != nil {
				return nil, ErrKeyInvalid.With("signature key material rejected")
			}
			derived, err := priv.PublicKey.Bytes()
			if err != nil {
				return nil, ErrKeyInvalid.With("signature key material rejected")
			}

			if len(publicBytes) > 0 && !bytes.Equal(publicBytes, derived) {
				return nil, ErrKeyInvalid.With("signature key material rejected")
			}
			sk.privateKey = priv
			sk.publicKey = &priv.PublicKey
			sk.privateBytes = privateBytes
			sk.publicBytes = derived
		case len(publicBytes) == publicLen:

			pub, err := ecdsa.ParseUncompressedPublicKey(curve, publicBytes)
			if err != nil {
				return nil, ErrKeyInvalid.With("signature key material rejected")
			}
			sk.publicKey = pub
			sk.publicBytes = publicBytes
		default:
			return nil, ErrKeyInvalid.With("signature key material rejected")
		}

		return sk, nil
	default:
		return nil, ErrConfigAlgUnsupported.With("unknown signature algorithm: " + string(algorithm))
	}
}

func GenerateSignatureKey(algorithm SignatureAlgorithm) (*Signature, error) {
	switch algorithm {
	case HmacSha256Mfs, HmacSha384Mfs, HmacSha512Mfs:
		size := 0
		switch algorithm {
		case HmacSha256Mfs:
			size = 32
		case HmacSha384Mfs:
			size = 48
		case HmacSha512Mfs:
			size = 64
		}
		key := make([]byte, size)
		if _, err := rand.Read(key); err != nil {
			return nil, ErrInternalUnknown.With("signing key generation failed")
		}
		return &Signature{
			algorithm:    algorithm,
			hmacKey:      key,
			privateBytes: key,
			publicBytes:  key,
		}, nil
	case EcdsaP256, EcdsaP384, EcdsaP521:
		curve, _, _ := ecdsaKeyInfo(algorithm)

		priv, err := ecdsa.GenerateKey(curve, rand.Reader)
		if err != nil {
			return nil, ErrInternalUnknown.With("signing key generation failed")
		}

		privateBytes, err := priv.Bytes()
		if err != nil {
			return nil, ErrInternalUnknown.With("signing key generation failed")
		}
		publicBytes, err := priv.PublicKey.Bytes()
		if err != nil {
			return nil, ErrInternalUnknown.With("signing key generation failed")
		}

		return &Signature{
			algorithm:    algorithm,
			privateKey:   priv,
			publicKey:    &priv.PublicKey,
			privateBytes: privateBytes,
			publicBytes:  publicBytes,
		}, nil
	default:
		return nil, ErrConfigAlgUnsupported.With("unknown signature algorithm: " + string(algorithm))
	}
}

func (sk *Signature) Algorithm() SignatureAlgorithm {
	return sk.algorithm
}

func (sk *Signature) KeyBase64Len() int {
	switch sk.algorithm {
	case HmacSha256Mfs:
		return 43
	case HmacSha384Mfs:
		return 64
	case HmacSha512Mfs:
		return 86
	case EcdsaP256:
		return 130
	case EcdsaP384:
		return 194
	case EcdsaP521:
		return 266
	default:
		return 0
	}
}

func (sk *Signature) ExportKey() ([]byte, error) {
	return sk.ExportKeyOption(false)
}

func (sk *Signature) ExportVerifyOnlyKey() ([]byte, error) {
	return sk.ExportKeyOption(true)
}

func (sk *Signature) ExportKeyOption(verifyOnly bool) ([]byte, error) {
	if verifyOnly && !sk.SupportVerifyOnly() {
		return nil, ErrKeyVerifyOnlyUnsupported.With(string(sk.algorithm))
	}

	switch sk.algorithm {
	case HmacSha256Mfs, HmacSha384Mfs, HmacSha512Mfs:
		return sk.hmacKey, nil
	case EcdsaP256, EcdsaP384, EcdsaP521:
		if !verifyOnly && sk.privateKey != nil {
			res := make([]byte, len(sk.privateBytes)+len(sk.publicBytes))
			copy(res, sk.privateBytes)
			copy(res[len(sk.privateBytes):], sk.publicBytes)
			return res, nil
		}
		return sk.publicBytes, nil
	default:
		return nil, ErrConfigAlgUnsupported.With("unknown signature algorithm: " + string(sk.algorithm))
	}
}

func (sk *Signature) ToBytes() ([]byte, []byte) {
	return sk.privateBytes, sk.publicBytes
}

func (sk *Signature) Sign(data []byte) ([]byte, error) {
	switch sk.algorithm {
	case HmacSha256Mfs, HmacSha384Mfs, HmacSha512Mfs:
		return sk.hmacSum(data), nil
	case EcdsaP256, EcdsaP384, EcdsaP521:
		if sk.privateKey == nil {
			return nil, ErrSigKeyMissing
		}

		h := sk.newHash()
		h.Write(data)
		digest := h.Sum(nil)

		r, s, err := ecdsa.Sign(rand.Reader, sk.privateKey, digest)
		if err != nil {
			return nil, ErrSigBackend.With("ecdsa sign failed")
		}

		byteSize := (sk.privateKey.Curve.Params().BitSize + 7) / 8
		sig := make([]byte, byteSize*2)
		r.FillBytes(sig[:byteSize])
		s.FillBytes(sig[byteSize:])

		return sig, nil
	default:
		return nil, ErrConfigAlgUnsupported.With("unknown signature algorithm: " + string(sk.algorithm))
	}
}

func (sk *Signature) Verify(body, sign []byte) error {
	if len(sign) == 0 {
		return ErrSigMalformed.With("signature is empty")
	}
	switch sk.algorithm {
	case HmacSha256Mfs, HmacSha384Mfs, HmacSha512Mfs:
		if hmac.Equal(sign, sk.hmacSum(body)) {
			return nil
		}
		return ErrSigMismatch
	case EcdsaP256, EcdsaP384, EcdsaP521:
		if sk.publicKey == nil {
			return ErrKeyInvalid.With("no public key to verify with")
		}

		byteSize := (sk.publicKey.Curve.Params().BitSize + 7) / 8
		if len(sign) != byteSize*2 {
			return ErrSigMalformed.With("ecdsa signature length does not match the curve")
		}

		r := new(big.Int).SetBytes(sign[:byteSize])
		s := new(big.Int).SetBytes(sign[byteSize:])

		h := sk.newHash()
		h.Write(body)
		digest := h.Sum(nil)

		if ecdsa.Verify(sk.publicKey, digest, r, s) {
			return nil
		}
		return ErrSigMismatch
	default:
		return ErrConfigAlgUnsupported.With("unknown signature algorithm: " + string(sk.algorithm))
	}
}

func (sk *Signature) Signable() bool {
	switch sk.algorithm {
	case HmacSha256Mfs, HmacSha384Mfs, HmacSha512Mfs:
		return true
	case EcdsaP256, EcdsaP384, EcdsaP521:
		return sk.privateKey != nil
	default:
		return false
	}
}

func (sk *Signature) SupportVerifyOnly() bool {
	switch sk.algorithm {
	case EcdsaP256, EcdsaP384, EcdsaP521:
		return true
	default:
		return false
	}
}
