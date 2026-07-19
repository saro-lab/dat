package dat_test

import (
	"fmt"
	"math/rand/v2"
	"testing"

	"github.com/saro-lab/dat-go/v4"
)

func randStringCert() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 100)
	for i := range b {
		b[i] = charset[rand.IntN(len(charset))]
	}
	return string(b)
}

func unitCert(t *testing.T, failCertificate *dat.Certificate, cid uint64, signatureAlgorithm dat.SignatureAlgorithm, cryptoAlgorithm dat.CryptoAlgorithm, plain string, secure string) error {
	tag := fmt.Sprintf("dat.%s.%s.%x", signatureAlgorithm, cryptoAlgorithm, cid)

	now := dat.NowUnixTimestamp()
	newCertificate, err := dat.GenerateCertificate(cid, now-10, 610, 60, signatureAlgorithm, cryptoAlgorithm)
	if err != nil {
		return err
	}
	newCertificateStr, err := newCertificate.Export(false)
	if err != nil {
		return err
	}

	readCertificate, err := dat.ParseCertificate(newCertificateStr)
	if err != nil {
		return err
	}

	manager := dat.NewManager()
	token, err := manager.IssueWithCertificate(newCertificate, plain, secure)
	if err != nil {
		return err
	}
	fmt.Printf("%s: %s\n", tag, token)

	d, err := dat.ParseDat(token)
	if err != nil {
		return err
	}

	payload, err := manager.ParseWithCertificate(readCertificate, d)
	if err != nil {
		return err
	}

	if plain != payload.PlainText() {
		t.Errorf("expected plain %s, got %s", plain, payload.PlainText())
	}
	if secure != payload.SecureText() {
		t.Errorf("expected secure %s, got %s", secure, payload.SecureText())
	}

	if _, err := manager.ParseWithCertificate(failCertificate, d); err == nil {
		t.Errorf("should fail with different certificate")
	}

	return nil
}

func TestCertificate(t *testing.T) {
	signAlgs := []dat.SignatureAlgorithm{
		dat.HmacSha256Mfs, dat.HmacSha384Mfs, dat.HmacSha512Mfs,
		dat.EcdsaP256, dat.EcdsaP384, dat.EcdsaP521,
	}
	cryptoAlgs := []dat.CryptoAlgorithm{dat.IvAes128Gcm, dat.IvAes256Gcm}

	now := dat.NowUnixTimestamp()
	failCertificate, _ := dat.GenerateCertificate(192874, now-10, 610, 60, dat.EcdsaP256, dat.IvAes256Gcm)

	for _, signAlg := range signAlgs {
		for _, cryptoAlg := range cryptoAlgs {
			// random
			for i := uint64(1); i < 21; i++ {
				plain := randStringCert()
				secure := randStringCert()
				if err := unitCert(t, failCertificate, i, signAlg, cryptoAlg, plain, secure); err != nil {
					t.Fatalf("@%v", err)
				}
			}
			// empty
			if err := unitCert(t, failCertificate, 0, signAlg, cryptoAlg, "", ""); err != nil {
				t.Fatal(err)
			}
		}
	}
}
