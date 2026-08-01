module github.com/saro-lab/dat/dat-go/v4

// D-10: ecdsa.ParseRawPrivateKey / ParseUncompressedPublicKey / (*ecdsa.Key).Bytes
// replace the deprecated elliptic.Marshal family and were added in go 1.25.
go 1.25
