package dat

import (
	"slices"
	"strconv"
	"strings"
	"sync"
)

type Manager struct {
	issuer       *Certificate
	certificates []*Certificate
	certIndex    map[uint64]*Certificate
	mu           sync.RWMutex
}

func NewManager() *Manager {
	return &Manager{
		certificates: []*Certificate{},
		certIndex:    map[uint64]*Certificate{},
	}
}

func noIssuableCause(certificates []*Certificate) error {
	now := NowUnixTimestamp()
	signableSeen, notYet, ended := false, false, false

	for _, cert := range certificates {
		if !cert.Signable() {
			continue
		}
		signableSeen = true
		if now < cert.DatIssuanceStartSeconds {
			notYet = true
		} else if now > cert.DatIssuanceEndSeconds {
			ended = true
		}
	}

	switch {
	case !signableSeen:
		return ErrCertVerifyOnly
	case notYet:

		return ErrCertNotYetIssuable
	case ended:
		return ErrCertIssuanceEnded
	default:
		return ErrCertExpired
	}
}

func (m *Manager) Issue(plain, secure string) (string, error) {
	m.mu.RLock()
	issuer := m.issuer
	certificates := m.certificates
	m.mu.RUnlock()

	if issuer == nil {
		if len(certificates) == 0 {
			return "", ErrManagerNoCertificate
		}
		return "", ErrManagerNoIssuableCertificate.Wrap(noIssuableCause(certificates))
	}
	return m.IssueWithCertificate(issuer, plain, secure)
}

func (m *Manager) Parse(datStr string) (Payload, error) {
	d, err := ParseDat(datStr)
	if err != nil {
		return Payload{}, err
	}
	return m.ParseDat(d)
}

func (m *Manager) ParseDat(dat *Dat) (Payload, error) {
	m.mu.RLock()
	cert := m.certIndex[dat.Cid]
	m.mu.RUnlock()

	if cert == nil {
		return Payload{}, ErrCertNotFound
	}
	return m.ParseWithCertificate(cert, dat)
}

func (m *Manager) ParseWithoutVerify(datStr string) (Payload, error) {
	d, err := ParseDat(datStr)
	if err != nil {
		return Payload{}, err
	}
	return m.ParseDatWithoutVerify(d)
}

func (m *Manager) ParseDatWithoutVerify(dat *Dat) (Payload, error) {
	m.mu.RLock()
	cert := m.certIndex[dat.Cid]
	m.mu.RUnlock()

	if cert == nil {
		return Payload{}, ErrCertNotFound
	}
	return m.ParseWithoutVerifyWithCertificate(cert, dat)
}

func (m *Manager) ExportCids() []uint64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	cids := make([]uint64, len(m.certificates))
	for i, cert := range m.certificates {
		cids[i] = cert.Cid
	}
	return cids
}

func (m *Manager) Export(verifyOnly bool) string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var sb strings.Builder
	for i, cert := range m.certificates {
		if i > 0 {
			sb.WriteString("\n")
		}
		exported, _ := cert.Export(verifyOnly)
		sb.WriteString(exported)
	}
	return sb.String()
}

func (m *Manager) ExportCertificates() ([]*Certificate, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	certificates := make([]*Certificate, 0, len(m.certificates))
	for _, cert := range m.certificates {
		cloned, err := cert.TryClone()
		if err != nil {
			return nil, err
		}
		certificates = append(certificates, cloned)
	}
	return certificates, nil
}

func (m *Manager) Import(format string, clear bool) (int, error) {
	lines := strings.Split(format, "\n")
	var newCerts []*Certificate
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		cert, err := ParseCertificate(line)
		if err != nil {
			return 0, err
		}
		newCerts = append(newCerts, cert)
	}
	return m.ImportCertificates(newCerts, clear)
}

func (m *Manager) ImportCertificates(newCertificates []*Certificate, clear bool) (int, error) {
	ids := make(map[uint64]bool)
	for _, cert := range newCertificates {
		if ids[cert.Cid] {
			return 0, ErrCertDuplicateCid
		}
		ids[cert.Cid] = true
	}

	var renewCount int = 0

	m.mu.Lock()
	defer m.mu.Unlock()

	var certificates []*Certificate
	if clear {
		certificates = []*Certificate{}
	} else {
		certificates = slices.Clone(m.certificates)
	}

	for _, newCert := range newCertificates {
		found := false
		for _, cert := range certificates {
			if cert.Cid == newCert.Cid {
				found = true
				break
			}
		}
		if !found {
			certificates = append(certificates, newCert)
			renewCount++
		}
	}

	var filtered []*Certificate
	for _, cert := range certificates {
		if !cert.Expired() {
			filtered = append(filtered, cert)
		}
	}

	slices.SortFunc(filtered, func(a, b *Certificate) int {
		if a.DatIssuanceEndSeconds < b.DatIssuanceEndSeconds {
			return -1
		} else if a.DatIssuanceEndSeconds > b.DatIssuanceEndSeconds {
			return 1
		}
		return 0
	})

	var issuer *Certificate
	for i := len(filtered) - 1; i >= 0; i-- {
		if filtered[i].Issuable() {
			issuer = filtered[i]
			break
		}
	}

	certIndex := make(map[uint64]*Certificate, len(filtered))
	for _, cert := range filtered {
		certIndex[cert.Cid] = cert
	}

	m.issuer = issuer
	m.certificates = filtered
	m.certIndex = certIndex

	return renewCount, nil
}

func (m *Manager) IssueWithCertificate(certificate *Certificate, plain, secure string) (string, error) {
	encrypted, err := certificate.CryptoKey.Encrypt([]byte(secure))
	if err != nil {
		return "", err
	}

	buf := make([]byte, 0, 20+len(certificate.cidPreCopy)+
		base64URL.EncodedLen(len(plain))+1+base64URL.EncodedLen(len(encrypted))+1+180)
	buf = strconv.AppendUint(buf, NowUnixTimestamp()+certificate.DatTtlSeconds, 10)
	buf = append(buf, certificate.cidPreCopy...)
	buf = base64URL.AppendEncode(buf, []byte(plain))
	buf = append(buf, '.')
	buf = base64URL.AppendEncode(buf, encrypted)

	signature, err := certificate.SignatureKey.Sign(buf)
	if err != nil {
		return "", err
	}
	buf = append(buf, '.')
	buf = base64URL.AppendEncode(buf, signature)

	return string(buf), nil
}

func (m *Manager) ParseWithCertificate(certificate *Certificate, dat *Dat) (Payload, error) {
	if err := certificate.SignatureKey.Verify(dat.BodyBytes(), dat.Signature); err != nil {
		return Payload{}, err
	}
	return m.ParseWithoutVerifyWithCertificate(certificate, dat)
}

func (m *Manager) ParseWithoutVerifyWithCertificate(certificate *Certificate, dat *Dat) (Payload, error) {
	plain, err := dat.Plain()
	if err != nil {
		return Payload{}, err
	}
	secureEncoded, err := dat.Secure()
	if err != nil {
		return Payload{}, err
	}
	secure, err := certificate.CryptoKey.Decrypt(secureEncoded)
	if err != nil {
		return Payload{}, err
	}

	return Payload{
		Plain:  plain,
		Secure: secure,
	}, nil
}
