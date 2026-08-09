package dat

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"io"
)

type CryptoAlgorithm string

const (
	IvAes128Gcm CryptoAlgorithm = "IV-AES128-GCM"
	IvAes256Gcm CryptoAlgorithm = "IV-AES256-GCM"
)

const (
	AES128GCMN = IvAes128Gcm
	AES256GCMN = IvAes256Gcm
)

type Crypto struct {
	algorithm CryptoAlgorithm
	key       []byte
	block     cipher.Block
	gcm       cipher.AEAD
}

func cryptoKeyLen(algorithm CryptoAlgorithm) (int, error) {
	switch algorithm {
	case IvAes128Gcm:
		return 16, nil
	case IvAes256Gcm:
		return 32, nil
	default:
		return 0, ErrConfigAlgUnsupported.With("unknown crypto algorithm: " + string(algorithm))
	}
}

func NewCryptoKey(algorithm CryptoAlgorithm, data []byte) (*Crypto, error) {
	size, err := cryptoKeyLen(algorithm)
	if err != nil {
		return nil, err
	}

	if len(data) != size {
		return nil, ErrKeyInvalid.With("crypto key length does not match the declared algorithm")
	}
	block, err := aes.NewCipher(data)
	if err != nil {
		return nil, ErrKeyInvalid.With("aes key rejected")
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, ErrInternalUnavailable.With("aes-gcm is not available on this platform")
	}
	return &Crypto{
		algorithm: algorithm,
		key:       data,
		block:     block,
		gcm:       gcm,
	}, nil
}

func GenerateCryptoKey(algorithm CryptoAlgorithm) (*Crypto, error) {
	size, err := cryptoKeyLen(algorithm)
	if err != nil {
		return nil, err
	}
	key := make([]byte, size)

	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return nil, ErrInternalUnknown.With("crypto key random generation failed")
	}
	return NewCryptoKey(algorithm, key)
}

func (ck *Crypto) Algorithm() CryptoAlgorithm {
	return ck.algorithm
}

func (ck *Crypto) ToBytes() []byte {
	return ck.key
}

func (ck *Crypto) KeyBase64Len() int {
	switch ck.algorithm {
	case IvAes128Gcm:
		return 22
	case IvAes256Gcm:
		return 43
	default:
		return 0
	}
}

func (ck *Crypto) Encrypt(body []byte) ([]byte, error) {
	if len(body) == 0 {
		return []byte{}, nil
	}
	encData := make([]byte, 12, 12+len(body)+16)
	if _, err := io.ReadFull(rand.Reader, encData); err != nil {
		return nil, ErrInternalUnknown.With("iv random generation failed")
	}
	encData = ck.gcm.Seal(encData, encData[:12], body, nil)
	return encData, nil
}

func (ck *Crypto) Decrypt(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return []byte{}, nil
	}
	if len(data) <= 12 {
		return nil, ErrCryptoDataInvalid.With("ciphertext is shorter than the 12-byte iv")
	}
	nonce := data[:12]
	ciphertext := data[12:]

	plaintext, err := ck.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, ErrCryptoTagMismatch
	}
	return plaintext, nil
}
