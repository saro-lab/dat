pub const VERSION_DAT_CARGO: &str = env!("CARGO_PKG_VERSION");
pub mod certificate;
#[cfg(feature = "dat_cms")]
pub mod cms_manager;
pub mod crypto;
pub mod dat;
pub mod error;
pub mod manager;
pub mod payload;
pub mod signature;
pub(crate) mod signature_ecdsa;
pub(crate) mod signature_hmac;
pub mod util;
