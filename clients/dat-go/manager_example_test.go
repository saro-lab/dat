package dat_test

import (
	"testing"

	"github.com/saro-lab/dat-go/v4"
)

func TestManagerExample(t *testing.T) {
	manager := dat.NewManager()

	now := dat.NowUnixTimestamp()
	cert, err := dat.GenerateCertificate(1, now-10, 610, 60, dat.EcdsaP256, dat.IvAes256Gcm)
	if err != nil {
		t.Fatal(err)
	}

	_, err = manager.ImportCertificates([]*dat.Certificate{cert}, false)
	if err != nil {
		t.Fatal(err)
	}

	plain := "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
	secure := "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

	datStr, err := manager.Issue(plain, secure)
	if err != nil {
		t.Fatal(err)
	}

	payload, err := manager.Parse(datStr)
	if err != nil {
		t.Fatal(err)
	}

	if payload.PlainText() != plain {
		t.Errorf("expected plain %s, got %s", plain, payload.PlainText())
	}
	if payload.SecureText() != secure {
		t.Errorf("expected secure %s, got %s", secure, payload.SecureText())
	}

	println(datStr)
	println(payload.PlainText())
	println(payload.SecureText())
}
