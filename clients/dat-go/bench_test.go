package dat_test

import (
	"fmt"
	"math/rand/v2"
	"sync"
	"testing"
	"time"

	"github.com/saro-lab/dat-go/v4"
)

func randStringBench() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 100)
	for i := range b {
		b[i] = charset[rand.IntN(len(charset))]
	}
	return string(b)
}

func loopsBench(multiThread bool, loopSize int, certificates []*dat.Certificate, plain, secure string) {
	if multiThread {
		fmt.Println("\nMulti-Thread")
	} else {
		fmt.Println("\nSingle-Thread")
	}

	manager := dat.NewManager()

	for _, certificate := range certificates {
		pre := fmt.Sprintf("%s %s", certificate.SignatureAlgorithm(), certificate.CryptoAlgorithm())

		var lastToken string
		start := time.Now()
		if multiThread {
			var wg sync.WaitGroup
			var mu sync.Mutex
			for range loopSize {
				wg.Add(1)
				go func() {
					defer wg.Done()
					token, _ := manager.IssueWithCertificate(certificate, plain, secure)
					mu.Lock()
					lastToken = token
					mu.Unlock()
				}()
			}
			wg.Wait()
		} else {
			for range loopSize {
				lastToken, _ = manager.IssueWithCertificate(certificate, plain, secure)
			}
		}
		duration := time.Since(start)
		fmt.Printf("%s Issue * %d : %dms\n", pre, loopSize, duration.Milliseconds())

		d, _ := dat.ParseDat(lastToken)
		var lastPayload dat.Payload

		start = time.Now()
		if multiThread {
			var wg sync.WaitGroup
			var mu sync.Mutex
			for range loopSize {
				wg.Add(1)
				go func() {
					defer wg.Done()
					payload, _ := manager.ParseWithCertificate(certificate, d)
					mu.Lock()
					lastPayload = payload
					mu.Unlock()
				}()
			}
			wg.Wait()
		} else {
			for range loopSize {
				lastPayload, _ = manager.ParseWithCertificate(certificate, d)
			}
		}
		duration = time.Since(start)
		fmt.Printf("%s Parse * %d : %dms\n", pre, loopSize, duration.Milliseconds())

		if lastPayload.PlainText() != plain || lastPayload.SecureText() != secure {
			panic("payload mismatch")
		}
	}
}

func TestBenchmark(t *testing.T) {
	loopSize := 10000

	plain := randStringBench()
	secure := randStringBench()

	fmt.Println("performance test (plain, secure)")
	fmt.Printf("plain: %s\n", plain)
	fmt.Printf("secure: %s\n", secure)

	signAlgs := []dat.SignatureAlgorithm{
		dat.HmacSha256Mfs, dat.HmacSha384Mfs, dat.HmacSha512Mfs,
		dat.EcdsaP256, dat.EcdsaP384, dat.EcdsaP521,
	}
	cryptoAlgs := []dat.CryptoAlgorithm{dat.IvAes128Gcm, dat.IvAes256Gcm}

	var certificates []*dat.Certificate
	now := dat.NowUnixTimestamp()
	for _, sa := range signAlgs {
		for _, ca := range cryptoAlgs {
			cert, _ := dat.GenerateCertificate(0, now-10, 610, 60, sa, ca)
			certificates = append(certificates, cert)
		}
	}

	loopsBench(true, loopSize, certificates, plain, secure)
	loopsBench(false, loopSize, certificates, plain, secure)
}
