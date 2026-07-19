package dat

import (
	"encoding/base64"
	"strconv"
	"time"
)

var base64URL = base64.RawURLEncoding

func EncodeBase64URL(b []byte) string {
	return base64URL.EncodeToString(b)
}

func DecodeBase64URL(b64 string) ([]byte, error) {
	data, err := base64URL.DecodeString(b64)
	if err != nil {
		return nil, ErrInvalidBase64Format
	}
	return data, nil
}

func NowUnixTimestamp() uint64 {
	return uint64(time.Now().Unix())
}

func ToHexFromU64(n uint64) string {
	if n == 0 {
		return "0"
	}
	return strconv.FormatUint(n, 16)
}

func ToHexFromU64Out(n uint64, out *string) {
	if n == 0 {
		*out += "0"
		return
	}
	*out += strconv.FormatUint(n, 16)
}

func ToUTF8(b []byte) (string, error) {
	return string(b), nil // Go strings are always UTF-8 or can contain any bytes, but usually we just convert
}
