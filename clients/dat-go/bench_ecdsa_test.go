package dat_test

import (
	"fmt"
	"math/rand/v2"
	"testing"
	"time"

	"github.com/saro-lab/dat-go/v4"
)

func randStringEcdsaBench() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 100)
	for i := range b {
		b[i] = charset[rand.IntN(len(charset))]
	}
	return string(b)
}

func TestBenchEcdsa(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping benchmark in short mode")
	}

	loopSize := 10000
	algs := []dat.SignatureAlgorithm{dat.EcdsaP256, dat.EcdsaP384, dat.EcdsaP521}

	for _, algorithm := range algs {
		key, _ := dat.GenerateSignatureKey(algorithm)
		plain := randStringEcdsaBench()
		plainBytes := []byte(plain)
		var sig []byte

		start := time.Now()
		for range loopSize {
			sig, _ = key.Sign(plainBytes)
		}
		duration := time.Since(start)
		fmt.Printf("%s sign * %d : %dms\n", algorithm, loopSize, duration.Milliseconds())

		start = time.Now()
		for range loopSize {
			_ = key.Verify(plainBytes, sig)
		}
		duration = time.Since(start)
		fmt.Printf("%s verify * %d : %dms\n", algorithm, loopSize, duration.Milliseconds())
	}
}
