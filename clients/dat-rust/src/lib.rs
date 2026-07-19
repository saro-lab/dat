pub const VERSION_DAT_CARGO: &str = env!("CARGO_PKG_VERSION");
pub mod crypto;
pub mod util;
pub mod signature;
pub(crate) mod signature_ecdsa;
pub(crate) mod signature_hmac;
pub mod payload;
pub mod dat;
pub mod certificate;
pub mod manager;
#[cfg(feature = "dat_cms")]
pub mod cms_manager;
pub mod error;
