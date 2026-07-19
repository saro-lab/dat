package dat_test

import (
	"fmt"
	"math/rand/v2"
	"testing"

	"github.com/saro-lab/dat-go/v4"
)

func randStringSig() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 100)
	for i := range b {
		b[i] = charset[rand.IntN(len(charset))]
	}
	return string(b)
}

func signingAndVerifying(t *testing.T, alg dat.SignatureAlgorithm) error {
	tag := fmt.Sprintf("Signature %s", alg)
	key, err := dat.GenerateSignatureKey(alg)
	if err != nil {
		return err
	}
	s, v := key.ToBytes()
	b64S := dat.EncodeBase64URL(s)
	b64V := dat.EncodeBase64URL(v)

	decodedS, _ := dat.DecodeBase64URL(b64S)
	decodedV, _ := dat.DecodeBase64URL(b64V)
	parseKey, err := dat.NewSignatureKey(alg, decodedS, decodedV)
	if err != nil {
		return err
	}

	rs := randStringSig()
	sign, err := key.Sign([]byte(rs))
	if err != nil {
		return err
	}
	signB64 := dat.EncodeBase64URL(sign)

	decodedSign, _ := dat.DecodeBase64URL(signB64)
	err = parseKey.Verify([]byte(rs), decodedSign)
	verify := err == nil
	if !verify {
		t.Errorf("%s verify failed: %v", alg, err)
	}

	otherKey, _ := dat.GenerateSignatureKey(alg)
	otherSign, _ := otherKey.Sign([]byte(rs))
	err = parseKey.Verify([]byte(rs), otherSign)
	unVerify := err == nil
	if unVerify {
		t.Errorf("%s unverify should fail", alg)
	}

	fmt.Printf("%s verify %v / unverify %v\n", tag, verify, unVerify)
	return nil
}

func TestSignature(t *testing.T) {
	algs := []dat.SignatureAlgorithm{
		dat.HmacSha256Mfs, dat.HmacSha384Mfs, dat.HmacSha512Mfs,
		dat.EcdsaP256, dat.EcdsaP384, dat.EcdsaP521,
	}
	for _, alg := range algs {
		for i := 0; i < 20; i++ {
			if err := signingAndVerifying(t, alg); err != nil {
				t.Fatal(err)
			}
		}
	}
}
