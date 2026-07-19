package dat_test

import (
	"fmt"
	"math/rand/v2"
	"testing"

	"github.com/saro-lab/dat-go/v4"
)

func randStringCrypto() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 100)
	for i := range b {
		b[i] = charset[rand.IntN(len(charset))]
	}
	return string(b)
}

func encryptAndDecrypt(t *testing.T, alg dat.CryptoAlgorithm, randStr string) error {
	tag := fmt.Sprintf("Crypto %s", alg)
	fmt.Printf("%s ready\n", tag)

	key := dat.GenerateCryptoKey(alg)
	byteKey := key.ToBytes()
	b64Key := dat.EncodeBase64URL(byteKey)
	fmt.Printf("%s key %s\n", tag, b64Key)

	decodedKey, err := dat.DecodeBase64URL(b64Key)
	if err != nil {
		return err
	}
	parseKey, err := dat.NewCryptoKey(alg, decodedKey)
	if err != nil {
		return err
	}

	randBytes := []byte(randStr)
	fmt.Printf("%s rand_string %s\n", tag, randStr)

	encrypted, err := key.Encrypt(randBytes)
	if err != nil {
		return err
	}
	encryptStr := dat.EncodeBase64URL(encrypted)
	fmt.Printf("encrypt1: %s\n", encryptStr)

	decodedEncrypted, err := dat.DecodeBase64URL(encryptStr)
	if err != nil {
		return err
	}
	decrypted, err := parseKey.Decrypt(decodedEncrypted)
	if err != nil {
		return err
	}

	if string(randBytes) != string(decrypted) {
		t.Errorf("expected %s, got %s", randStr, string(decrypted))
	}

	otherKey := dat.GenerateCryptoKey(alg)
	_, err = otherKey.Decrypt(decodedEncrypted)
	failDecrypt := err == nil
	if failDecrypt && randStr != "" {
		t.Errorf("%s unverify should fail", tag)
	}

	fmt.Printf("%s pass %v / fail %v\n", tag, randBytes, failDecrypt)
	return nil
}

func TestCrypto(t *testing.T) {
	algs := []dat.CryptoAlgorithm{dat.IvAes128Gcm, dat.IvAes256Gcm}
	for _, alg := range algs {
		// random
		for i := 0; i < 20; i++ {
			if err := encryptAndDecrypt(t, alg, randStringCrypto()); err != nil {
				t.Fatal(err)
			}
		}
		// empty
		if err := encryptAndDecrypt(t, alg, ""); err != nil {
			t.Fatal(err)
		}
	}
}
