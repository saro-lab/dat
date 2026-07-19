use crate::error::DatError;
use crate::util::{decode_base64_url, now_unix_timestamp};
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
            .map_err(|_| DatError::InvalidDat)
    }
    #[inline]
    pub(crate) fn secure(&self) -> Result<Vec<u8>, DatError> {
        decode_base64_url(&self.dat[self.secure_pos.. ])
            .map_err(|_| DatError::InvalidDat)
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

        let expire = parts.next()
            .and_then(|s| s.parse::<u64>().ok())
            .filter(|x| *x > now_unix_timestamp())
            .ok_or_else(|| DatError::InvalidDat)?;

        let cid = parts.next()
            .and_then(|s| u64::from_str_radix(s, 16).ok())
            .ok_or_else(|| DatError::InvalidDat)?;

        let ptr = dat.as_ptr() as usize;
        let plain = parts.next().ok_or_else(|| DatError::InvalidDat)?;
        let plain_pos = plain.as_ptr() as usize - ptr;

        let secure = parts.next().ok_or_else(|| DatError::InvalidDat)?;
        let secure_pos = secure.as_ptr() as usize - ptr;
        let secure_end = secure_pos + secure.len();

        let signature = parts.next().filter(|s| !s.is_empty()).ok_or_else(|| DatError::InvalidDat)?;

        if parts.next().is_some() {
            return Err(DatError::InvalidDat);
        }

        let signature = decode_base64_url(signature)?;
        let mut dat = dat.into_bytes();
        unsafe { dat.set_len(secure_end) };

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
