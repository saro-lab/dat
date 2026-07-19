package dat

import (
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

// Deprecated: Use EcdsaP256, EcdsaP384, EcdsaP521 instead
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
			return nil, ErrInvalidSignatureKey
		}
		return &Signature{
			algorithm:    algorithm,
			hmacKey:      privateBytes,
			privateBytes: privateBytes,
			publicBytes:  privateBytes,
		}, nil
	case EcdsaP256, EcdsaP384, EcdsaP521:
		var curve elliptic.Curve
		var privateLen, publicLen int
		switch algorithm {
		case EcdsaP256:
			curve = elliptic.P256()
			privateLen, publicLen = 32, 65
		case EcdsaP384:
			curve = elliptic.P384()
			privateLen, publicLen = 48, 97
		case EcdsaP521:
			curve = elliptic.P521()
			privateLen, publicLen = 66, 133
		}

		sk := &Signature{
			algorithm: algorithm,
		}

		if len(publicBytes) == publicLen {
			x, y := elliptic.Unmarshal(curve, publicBytes)
			if x == nil {
				return nil, ErrInvalidSignatureKey
			}
			sk.publicKey = &ecdsa.PublicKey{Curve: curve, X: x, Y: y}
			sk.publicBytes = publicBytes
		}

		if len(privateBytes) == privateLen {
			d := new(big.Int).SetBytes(privateBytes)
			if sk.publicKey == nil {
				x, y := curve.ScalarBaseMult(privateBytes)
				sk.publicKey = &ecdsa.PublicKey{Curve: curve, X: x, Y: y}
				sk.publicBytes = elliptic.Marshal(curve, x, y)
			}
			sk.privateKey = &ecdsa.PrivateKey{
				PublicKey: *sk.publicKey,
				D:         d,
			}
			sk.privateBytes = privateBytes
		} else if len(privateBytes) == privateLen+publicLen {
			// Some formats might store both
			d := new(big.Int).SetBytes(privateBytes[:privateLen])
			publicBytes = privateBytes[privateLen:]
			x, y := elliptic.Unmarshal(curve, publicBytes)
			if x == nil {
				return nil, ErrInvalidSignatureKey
			}
			sk.publicKey = &ecdsa.PublicKey{Curve: curve, X: x, Y: y}
			sk.publicBytes = publicBytes
			sk.privateKey = &ecdsa.PrivateKey{
				PublicKey: *sk.publicKey,
				D:         d,
			}
			sk.privateBytes = privateBytes[:privateLen]
		}

		if sk.publicKey == nil && sk.privateKey == nil {
			return nil, ErrInvalidSignatureKey
		}

		return sk, nil
	default:
		return nil, ErrUnknownSignatureAlgorithm
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
			return nil, ErrGenerateSigningKeyError
		}
		return &Signature{
			algorithm:    algorithm,
			hmacKey:      key,
			privateBytes: key,
			publicBytes:  key,
		}, nil
	case EcdsaP256, EcdsaP384, EcdsaP521:
		var curve elliptic.Curve
		switch algorithm {
		case EcdsaP256:
			curve = elliptic.P256()
		case EcdsaP384:
			curve = elliptic.P384()
		case EcdsaP521:
			curve = elliptic.P521()
		}

		priv, err := ecdsa.GenerateKey(curve, rand.Reader)
		if err != nil {
			return nil, ErrGenerateSigningKeyError
		}

		byteSize := (curve.Params().BitSize + 7) / 8
		privateBytes := priv.D.FillBytes(make([]byte, byteSize))
		publicBytes := elliptic.Marshal(curve, priv.PublicKey.X, priv.PublicKey.Y)

		return &Signature{
			algorithm:    algorithm,
			privateKey:   priv,
			publicKey:    &priv.PublicKey,
			privateBytes: privateBytes,
			publicBytes:  publicBytes,
		}, nil
	default:
		return nil, ErrUnknownSignatureAlgorithm
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
		return nil, ErrNotSupportedVerifyOnly
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
		return nil, ErrUnknownSignatureAlgorithm
	}
}

// Deprecated: Use ExportKey or ExportVerifyOnlyKey
func (sk *Signature) ToBytes() ([]byte, []byte) {
	return sk.privateBytes, sk.publicBytes
}

func (sk *Signature) Sign(data []byte) ([]byte, error) {
	switch sk.algorithm {
	case HmacSha256Mfs, HmacSha384Mfs, HmacSha512Mfs:
		return sk.hmacSum(data), nil
	case EcdsaP256, EcdsaP384, EcdsaP521:
		if sk.privateKey == nil {
			return nil, ErrNotExistsSigningKey
		}

		h := sk.newHash()
		h.Write(data)
		digest := h.Sum(nil)

		r, s, err := ecdsa.Sign(rand.Reader, sk.privateKey, digest)
		if err != nil {
			return nil, ErrSignError
		}

		byteSize := (sk.privateKey.Curve.Params().BitSize + 7) / 8
		sig := make([]byte, byteSize*2)
		r.FillBytes(sig[:byteSize])
		s.FillBytes(sig[byteSize:])

		return sig, nil
	default:
		return nil, ErrUnknownSignatureAlgorithm
	}
}

func (sk *Signature) Verify(body, sign []byte) error {
	if len(sign) == 0 {
		return ErrInvalidDat
	}
	switch sk.algorithm {
	case HmacSha256Mfs, HmacSha384Mfs, HmacSha512Mfs:
		if hmac.Equal(sign, sk.hmacSum(body)) {
			return nil
		}
		return ErrInvalidDat
	case EcdsaP256, EcdsaP384, EcdsaP521:
		if sk.publicKey == nil {
			return ErrInvalidDat
		}

		byteSize := (sk.publicKey.Curve.Params().BitSize + 7) / 8
		if len(sign) != byteSize*2 {
			return ErrInvalidDat
		}

		r := new(big.Int).SetBytes(sign[:byteSize])
		s := new(big.Int).SetBytes(sign[byteSize:])

		h := sk.newHash()
		h.Write(body)
		digest := h.Sum(nil)

		if ecdsa.Verify(sk.publicKey, digest, r, s) {
			return nil
		}
		return ErrInvalidDat
	default:
		return ErrUnknownSignatureAlgorithm
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
