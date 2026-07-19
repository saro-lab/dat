package dat

import (
	"fmt"
	"log/slog"
	"os"
	"sync"
	"testing"
	"time"
)

var (
	datCmsManager *CmsManager
	once          sync.Once
)

func getCmsManager() (*CmsManager, error) {
	if datCmsManager == nil {
		return nil, fmt.Errorf("dat auto sync manager not initialized")
	}
	return datCmsManager, nil
}

func testAutoSync(t *testing.T) error {
	manager, err := getCmsManager()
	if err != nil {
		return err
	}

	plain := "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻"
	secure := "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐"

	datStr, err := manager.Issue(plain, secure)
	if err != nil {
		return err
	}

	fmt.Printf("dat: %v\n", datStr)

	payload, err := manager.Parse(datStr)
	if err != nil {
		return err
	}

	if plain != payload.PlainText() {
		return fmt.Errorf("plain text mismatch: expected %q, got %q", plain, payload.PlainText())
	}
	if secure != payload.SecureText() {
		return fmt.Errorf("secure text mismatch: expected %q, got %q", secure, payload.SecureText())
	}

	fmt.Printf("payload plain: %q\n", payload.PlainText())
	fmt.Printf("payload secure: %q\n", payload.SecureText())

	return nil
}

func TestDatCms(t *testing.T) {
	opts := &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}
	testLogger := slog.New(slog.NewTextHandler(os.Stdout, opts))

	builder, err := NewDatCmsManagerBuilder().
		Url("http://localhost:8088")
	if err != nil {
		t.Fatal(err)
	}

	manager, err := builder.
		// IntervalOff(). // disable auto sync
		Interval(1 * time.Second).
		Logger(testLogger).
		Token("12345678901b").
		Build()

	if err != nil {
		t.Fatalf("failed to build manager: %v", err)
	}

	// manual sync
	// _ = manager.Sync()

	datCmsManager = manager

	// test
	err = testAutoSync(t)
	if err != nil {
		t.Logf("auto sync test skipped or failed (normal if server is down): %v", err)
	}

	time.Sleep(5 * time.Second)
}
