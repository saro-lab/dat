package dat

import (
	"fmt"
)

type Payload struct {
	Plain  []byte
	Secure []byte
}

func (p Payload) PlainText() string {
	return string(p.Plain)
}
func (p Payload) SecureText() string {
	return string(p.Secure)
}

func (p Payload) String() string {
	return fmt.Sprintf("%s %s", EncodeBase64URL(p.Plain), EncodeBase64URL(p.Secure))
}
