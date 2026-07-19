use crate::error::DatError;
use crate::util::{encode_base64_url};
use std::fmt::Display;

pub struct DatPayload {
    pub(crate) plain: Vec<u8>,
    pub(crate) secure: Vec<u8>,
}

impl DatPayload {
    #[inline]
    pub fn plain(&self) -> &[u8] {
        &self.plain
    }

    #[inline]
    pub fn plain_text(&self) -> Result<&str, DatError> {
        Ok(str::from_utf8(&self.plain)?)
    }

    #[inline]
    pub fn secure(&self) -> &[u8] {
        &self.secure
    }

    #[inline]
    pub fn secure_text(&self) -> Result<&str, DatError> {
        Ok(str::from_utf8(&self.secure)?)
    }
}

impl Display for DatPayload {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} {}", encode_base64_url(&*self.plain), encode_base64_url(&*self.secure))
    }
}
