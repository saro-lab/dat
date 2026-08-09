package dat_test

import (
	"strconv"
	"testing"

	dat "github.com/saro-lab/dat/dat-go/v4"
)

func TestCertificateNumbersArePureDecimal(t *testing.T) {
	for _, bad := range []string{"-1", " 100 ", "1_0", "0x10", "zzzz", "1e3", ""} {
		format := "ff." + bad + ".3600.60.HMAC-SHA256-MFS.IV-AES256-GCM.AAAA.AAAA"
		if _, err := dat.ParseCertificate(format); err == nil {
			t.Errorf("issuance start %q must be rejected", bad)
		}
	}
}

func TestDatExpireBoundary(t *testing.T) {
	now := dat.NowUnixTimestamp()
	body := func(expire uint64) string {
		return strconv.FormatUint(expire, 10) + ".ff...AAAA"
	}
	for _, expire := range []uint64{now - 1, now} {
		if _, err := dat.ParseDat(body(expire)); err == nil {
			t.Errorf("expire %d must be rejected at now %d", expire, now)
		}
	}
	if _, err := dat.ParseDat(body(now + 60)); err != nil {
		t.Errorf("expire now+60 must be accepted: %v", err)
	}
}

func TestEcdsaKeyPairIsCrossChecked(t *testing.T) {
	first, err := dat.GenerateSignatureKey(dat.EcdsaP256)
	if err != nil {
		t.Fatal(err)
	}
	second, err := dat.GenerateSignatureKey(dat.EcdsaP256)
	if err != nil {
		t.Fatal(err)
	}
	firstKey, err := first.ExportKeyOption(false)
	if err != nil {
		t.Fatal(err)
	}
	secondKey, err := second.ExportKeyOption(false)
	if err != nil {
		t.Fatal(err)
	}

	const privateLen = 32
	mixed := append(append([]byte{}, firstKey[:privateLen]...), secondKey[privateLen:]...)
	if _, err := dat.NewSignatureKey(dat.EcdsaP256, mixed, nil); err == nil {
		t.Error("mismatched ecdsa key pair must be rejected")
	}
	if _, err := dat.NewSignatureKey(dat.EcdsaP256, make([]byte, privateLen), nil); err == nil {
		t.Error("private scalar 0 must be rejected")
	}
}

func TestCryptoKeyLengthMatchesAlgorithm(t *testing.T) {
	if _, err := dat.NewCryptoKey(dat.IvAes256Gcm, make([]byte, 16)); err == nil {
		t.Error("16 byte key under IV-AES256-GCM must be rejected")
	}
	if _, err := dat.NewCryptoKey(dat.IvAes128Gcm, make([]byte, 32)); err == nil {
		t.Error("32 byte key under IV-AES128-GCM must be rejected")
	}
	if _, err := dat.NewCryptoKey(dat.CryptoAlgorithm("NOPE"), make([]byte, 32)); err == nil {
		t.Error("unknown crypto algorithm must be rejected")
	}
}
