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

// Deprecated: Use IvAes128Gcm, IvAes256Gcm instead
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

func NewCryptoKey(algorithm CryptoAlgorithm, data []byte) (*Crypto, error) {
	block, err := aes.NewCipher(data)
	if err != nil {
		return nil, ErrInvalidCryptoKey
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, ErrInvalidCryptoKey
	}
	return &Crypto{
		algorithm: algorithm,
		key:       data,
		block:     block,
		gcm:       gcm,
	}, nil
}

func GenerateCryptoKey(algorithm CryptoAlgorithm) *Crypto {
	var size int
	switch algorithm {
	case IvAes128Gcm:
		size = 16
	case IvAes256Gcm:
		size = 32
	default:
		size = 32
	}
	key := make([]byte, size)
	_, _ = io.ReadFull(rand.Reader, key)
	ck, _ := NewCryptoKey(algorithm, key)
	return ck
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
		return nil, ErrEncryptError
	}
	encData = ck.gcm.Seal(encData, encData[:12], body, nil)
	return encData, nil
}

func (ck *Crypto) Decrypt(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return []byte{}, nil
	}
	if len(data) <= 12 {
		return nil, ErrDecryptError
	}
	nonce := data[:12]
	ciphertext := data[12:]
	plaintext, err := ck.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, ErrDecryptError
	}
	return plaintext, nil
}
