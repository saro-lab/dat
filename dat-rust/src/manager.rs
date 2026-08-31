use crate::certificate::DatCertificate;
use crate::dat::Dat;
use crate::error::DatError;
use crate::payload::DatPayload;
use crate::util::{encode_base64_url_out, now_unix_timestamp, to_hex_u64_out};
use itertools::Itertools;
use std::sync::{PoisonError, RwLock, RwLockReadGuard, RwLockWriteGuard};

struct DatManagerState {
    issuer: Option<DatCertificate>,
    certificates: Vec<DatCertificate>,
}

pub struct DatManager {
    state: RwLock<DatManagerState>,
}

impl Default for DatManager {
    fn default() -> Self {
        Self::new()
    }
}

#[inline]
fn poisoned<T>(_: PoisonError<T>) -> DatError {
    DatError::InternalUnknown("dat manager lock is poisoned")
}

fn no_issuable_cause(certificates: &[DatCertificate]) -> DatError {
    let now = now_unix_timestamp();
    let (mut signable_seen, mut not_yet, mut ended) = (false, false, false);

    for certificate in certificates {
        if !certificate.signable() {
            continue;
        }
        signable_seen = true;
        if now < certificate.dat_issuance_start_seconds {
            not_yet = true;
        } else if now > certificate.dat_issuance_end_seconds {
            ended = true;
        }
    }

    if !signable_seen {
        DatError::CertVerifyOnly
    } else if not_yet {
        DatError::CertNotYetIssuable
    } else if ended {
        DatError::CertIssuanceEnded
    } else {
        DatError::CertExpired
    }
}

impl DatManager {
    pub fn new() -> Self {
        DatManager {
            state: RwLock::new(DatManagerState {
                issuer: None,
                certificates: vec![],
            }),
        }
    }

    #[inline]
    fn read(&self) -> Result<RwLockReadGuard<'_, DatManagerState>, DatError> {
        self.state.read().map_err(poisoned)
    }

    #[inline]
    fn write(&self) -> Result<RwLockWriteGuard<'_, DatManagerState>, DatError> {
        self.state.write().map_err(poisoned)
    }

    pub fn issue(&self, plain: &str, secure: &str) -> Result<String, DatError> {
        let state = self.read()?;
        if let Some(certificate) = state.issuer.as_ref() {
            Self::_issue(certificate, plain, secure)
        } else if state.certificates.is_empty() {
            Err(DatError::ManagerNoCertificate)
        } else {
            Err(DatError::ManagerNoIssuableCertificate(Box::new(
                no_issuable_cause(&state.certificates),
            )))
        }
    }

    pub fn parse<E: Into<DatError>>(
        &self,
        dat: impl TryInto<Dat, Error = E>,
    ) -> Result<DatPayload, DatError> {
        let dat = dat.try_into().map_err(Into::into)?;
        let cid = dat.cid;
        let state = self.read()?;
        if let Some(certificate) = state.certificates.iter().find(|x| x.cid == cid) {
            Self::_parse(certificate, dat)
        } else {
            Err(DatError::CertNotFound)
        }
    }

    pub fn parse_without_verify<E: Into<DatError>>(
        &self,
        dat: impl TryInto<Dat, Error = E>,
    ) -> Result<DatPayload, DatError> {
        let dat = dat.try_into().map_err(Into::into)?;
        let cid = dat.cid;
        let state = self.read()?;
        if let Some(certificate) = state.certificates.iter().find(|x| x.cid == cid) {
            Self::_parse_without_verify(certificate, dat)
        } else {
            Err(DatError::CertNotFound)
        }
    }

    pub fn export_cids(&self) -> Vec<u64> {
        self.state
            .read()
            .unwrap_or_else(PoisonError::into_inner)
            .certificates
            .iter()
            .map(|key| key.cid)
            .collect()
    }

    pub fn export(&self, verify_only: bool) -> Result<String, DatError> {
        let export = self
            .read()?
            .certificates
            .iter()
            .map(|key| key.export(verify_only))
            .collect::<Result<Vec<String>, DatError>>()?
            .join("\n");
        Ok(export)
    }

    pub fn export_certificates(&self) -> Result<Vec<DatCertificate>, DatError> {
        self.read()?
            .certificates
            .iter()
            .map(|x| x.try_clone())
            .collect()
    }

    pub fn import(&self, format: &str, clear: bool) -> Result<usize, DatError> {
        let format = format.trim();
        if format.is_empty() {
            return Ok(0);
        }
        let new_certificates = format
            .lines()
            .map(|s| s.parse::<DatCertificate>())
            .collect::<Result<Vec<DatCertificate>, DatError>>()?;
        self.import_certificates(new_certificates, clear)
    }

    pub fn import_certificates(
        &self,
        new_certificates: Vec<DatCertificate>,
        clear: bool,
    ) -> Result<usize, DatError> {
        if new_certificates.is_empty() {
            return Ok(0);
        }

        let mut apply_certs: usize = 0;
        let mut ids = new_certificates.iter().map(|x| x.cid).collect::<Vec<u64>>();
        ids.sort();
        ids.dedup();
        if ids.len() != new_certificates.len() {
            return Err(DatError::CertDuplicateCid);
        }

        let mut state = self.write()?;

        let mut certificates = if clear {
            vec![]
        } else {
            state
                .certificates
                .iter()
                .map(|x| x.try_clone())
                .collect::<Result<Vec<DatCertificate>, DatError>>()?
        };

        for certificate in new_certificates {
            if !certificates.contains(&certificate) {
                certificates.push(certificate);
                apply_certs += 1;
            }
        }

        let certificates = certificates
            .into_iter()
            .filter(|certificate| !certificate.expired())
            .sorted_by(|a, b| a.dat_issuance_end_seconds.cmp(&b.dat_issuance_end_seconds))
            .collect::<Vec<DatCertificate>>();

        let issuer = certificates
            .iter()
            .rev()
            .find(|x| x.issuable())
            .map(|x| x.try_clone())
            .transpose()?;

        state.issuer = issuer;
        state.certificates = certificates;

        Ok(apply_certs)
    }

    pub fn _issue<U: AsRef<[u8]>>(
        certificate: &DatCertificate,
        plain: U,
        secure: U,
    ) -> Result<String, DatError> {
        let mut ib = itoa::Buffer::new();
        let expire = now_unix_timestamp()
            .checked_add(certificate.dat_ttl_seconds)
            .ok_or(DatError::InternalUnknown(
                "now + dat_ttl_seconds overflowed u64",
            ))?;
        let expire = ib.format(expire);
        let plain = plain.as_ref();
        let secure = secure.as_ref();

        let mut v: String =
            String::with_capacity(60 + expire.len() + ((plain.len() + secure.len() + 100) * 4 / 3));
        let sk = &certificate.signature;

        v.push_str(expire);
        v.push('.');
        to_hex_u64_out(certificate.cid, &mut v);
        v.push('.');

        encode_base64_url_out(plain, &mut v);

        v.push('.');
        encode_base64_url_out(certificate.crypto.encrypt(secure)?, &mut v);

        let signature = sk.sign(v.as_bytes())?;
        v.push('.');
        encode_base64_url_out(&*signature, &mut v);
        Ok(v)
    }

    pub fn _parse(certificate: &DatCertificate, dat: Dat) -> Result<DatPayload, DatError> {
        certificate
            .signature
            .verify(dat.body_bytes(), &dat.signature)?;
        Self::_parse_without_verify(certificate, dat)
    }
    pub fn _parse_without_verify(
        certificate: &DatCertificate,
        dat: Dat,
    ) -> Result<DatPayload, DatError> {
        let plain = dat.plain()?;
        let secure = certificate.crypto.decrypt(dat.secure()?)?;

        Ok(DatPayload { plain, secure })
    }
}
