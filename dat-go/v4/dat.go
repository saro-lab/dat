package dat

import (
	"strconv"
)

type Dat struct {
	data      string
	Expire    uint64
	Cid       uint64
	plainPos  int
	securePos int
	Signature []byte
}

func (d *Dat) Plain() ([]byte, error) {
	return DecodeBase64URL(d.data[d.plainPos : d.securePos-1])
}

func (d *Dat) Secure() ([]byte, error) {
	return DecodeBase64URL(d.data[d.securePos:])
}

func (d *Dat) BodyBytes() []byte {
	return []byte(d.data)
}

func (d *Dat) String() string {
	return strconv.FormatUint(d.Expire, 10) + "." + ToHexFromU64(d.Cid)
}

func ParseDat(s string) (*Dat, error) {
	// single scan: a valid dat has exactly 5 dot-separated parts (4 dots)
	var dots [4]int
	n := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '.' {
			if n == 4 {
				return nil, ErrTokenMalformed.With("expected exactly 5 dot-separated fields")
			}
			dots[n] = i
			n++
		}
	}
	if n != 4 {
		return nil, ErrTokenMalformed.With("expected exactly 5 dot-separated fields")
	}

	// 구조가 확정된 뒤에야 값을 본다. 만료와 형식 오류를 갈라 낸다 — 예전에는 둘 다
	// ErrInvalidDat 하나였고, 그래서 호출부가 "토큰을 갱신하라"와 "세션을 끊어라"를
	// 구분할 수 없었다.
	expire, err := strconv.ParseUint(s[:dots[0]], 10, 64)
	if err != nil {
		return nil, ErrTokenMalformed.With("expire field is not a plain decimal u64")
	}
	if expire <= NowUnixTimestamp() {
		return nil, ErrTokenExpired
	}

	cid, err := strconv.ParseUint(s[dots[0]+1:dots[1]], 16, 64)
	if err != nil {
		return nil, ErrTokenMalformed.With("cid field is not a plain hex u64")
	}

	signatureB64 := s[dots[3]+1:]
	if signatureB64 == "" {
		return nil, ErrSigMalformed.With("signature field is empty")
	}

	signature, err := DecodeBase64URL(signatureB64)
	if err != nil {
		return nil, ErrSigMalformed.With("signature field is not base64url")
	}

	return &Dat{
		data:      s[:dots[3]],
		Expire:    expire,
		Cid:       cid,
		plainPos:  dots[1] + 1,
		securePos: dots[2] + 1,
		Signature: signature,
	}, nil
}
