use crate::error::DatError;
use crate::util::{decode_base64_url, now_unix_timestamp, parse_u64_dec, parse_u64_hex};
use std::fmt;
use std::str::FromStr;

pub struct Dat {
    dat: Vec<u8>,
    pub(crate) expire: u64,
    pub(crate) cid: u64,
    plain_pos: usize,
    secure_pos: usize,
    pub(crate) signature: Vec<u8>,
}
impl Dat {
    #[inline]
    pub fn expire(&self) -> u64 {
        self.expire
    }
    #[inline]
    pub fn cid(&self) -> u64 {
        self.cid
    }
    #[inline]
    pub(crate) fn plain(&self) -> Result<Vec<u8>, DatError> {
        decode_base64_url(&self.dat[self.plain_pos.. self.secure_pos - 1])
            .map_err(|_| DatError::TokenMalformed("plain field is not base64url"))
    }
    #[inline]
    pub(crate) fn secure(&self) -> Result<Vec<u8>, DatError> {
        decode_base64_url(&self.dat[self.secure_pos.. ])
            .map_err(|_| DatError::TokenMalformed("secure field is not base64url"))
    }

    #[inline]
    pub(crate) fn body_bytes(&self) -> &[u8] {
        &self.dat[..]
    }
}

impl fmt::Display for Dat {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}.{:x}", self.expire, self.cid)
    }
}

impl FromStr for Dat {
    type Err = DatError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        s.to_string().try_into()
    }
}

impl <'a>TryFrom<&'a str> for Dat {
    type Error = DatError;
    fn try_from(dat: &'a str) -> Result<Self, Self::Error> {
        dat.to_string().try_into()
    }
}

impl TryFrom<String> for Dat {
    type Error = DatError;
    fn try_from(dat: String) -> Result<Self, Self::Error> {
        let mut parts = dat.split('.');

        let expire_str = parts.next().unwrap_or("");
        let cid_str = parts.next().ok_or(DatError::TokenMalformed("expected exactly 5 dot-separated fields"))?;
        let plain = parts.next().ok_or(DatError::TokenMalformed("expected exactly 5 dot-separated fields"))?;
        let secure = parts.next().ok_or(DatError::TokenMalformed("expected exactly 5 dot-separated fields"))?;
        let signature = parts.next().ok_or(DatError::TokenMalformed("expected exactly 5 dot-separated fields"))?;
        if parts.next().is_some() {
            return Err(DatError::TokenMalformed("expected exactly 5 dot-separated fields"));
        }

        let expire = parse_u64_dec(expire_str)
            .ok_or(DatError::TokenMalformed("expire field is not a plain decimal u64"))?;
        if expire <= now_unix_timestamp() {
            return Err(DatError::TokenExpired);
        }

        let cid = parse_u64_hex(cid_str)
            .ok_or(DatError::TokenMalformed("cid field is not a plain hex u64"))?;

        if signature.is_empty() {
            return Err(DatError::SigMalformed("signature field is empty"));
        }

        let plain_pos = expire_str.len() + 1 + cid_str.len() + 1;
        let secure_pos = plain_pos + plain.len() + 1;
        let secure_end = secure_pos + secure.len();

        let signature = decode_base64_url(signature)
            .map_err(|_| DatError::SigMalformed("signature field is not base64url"))?;
        let mut dat = dat.into_bytes();
        dat.truncate(secure_end);

        Ok(Dat {
            dat,
            expire,
            cid,
            plain_pos,
            secure_pos,
            signature,
        })
    }
}
