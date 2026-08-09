use axum::http::StatusCode;

pub const OK: &str = "ok";

pub const AUTH_UNAUTHORIZED: &str = "DAT_AUTH_UNAUTHORIZED";
pub const AUTH_FORBIDDEN: &str = "DAT_AUTH_FORBIDDEN";
pub const AUTH_DISABLED: &str = "DAT_AUTH_DISABLED";

pub const REQ_MALFORMED: &str = "DAT_REQ_MALFORMED";
pub const REQ_ALG_UNSUPPORTED: &str = "DAT_REQ_ALG_UNSUPPORTED";
pub const REQ_NOT_FOUND: &str = "DAT_REQ_NOT_FOUND";
pub const REQ_TOO_LARGE: &str = "DAT_REQ_TOO_LARGE";
pub const REQ_UNKNOWN: &str = "DAT_REQ_UNKNOWN";

pub const STORE_UNAVAILABLE: &str = "DAT_STORE_UNAVAILABLE";
pub const STORE_UNKNOWN: &str = "DAT_STORE_UNKNOWN";

pub fn status_of(code: &str) -> StatusCode {
    match code {
        OK => StatusCode::OK,

        AUTH_UNAUTHORIZED => StatusCode::UNAUTHORIZED,
        AUTH_FORBIDDEN => StatusCode::FORBIDDEN,

        REQ_NOT_FOUND => StatusCode::NOT_FOUND,
        REQ_TOO_LARGE => StatusCode::PAYLOAD_TOO_LARGE,
        REQ_MALFORMED | REQ_ALG_UNSUPPORTED | REQ_UNKNOWN => StatusCode::BAD_REQUEST,

        STORE_UNAVAILABLE => StatusCode::SERVICE_UNAVAILABLE,
        STORE_UNKNOWN => StatusCode::INTERNAL_SERVER_ERROR,

        _ => dat_common_status(code),
    }
}

fn dat_common_status(code: &str) -> StatusCode {
    if code.starts_with("DAT_CONFIG_")
        || code.starts_with("DAT_TOKEN_")
        || code.starts_with("DAT_SIG_")
        || code.starts_with("DAT_CRYPTO_")
    {
        return StatusCode::BAD_REQUEST;
    }
    StatusCode::INTERNAL_SERVER_ERROR
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn server_codes_map_to_their_documented_status() {
        assert_eq!(status_of(OK), StatusCode::OK);
        assert_eq!(status_of(AUTH_UNAUTHORIZED), StatusCode::UNAUTHORIZED);
        assert_eq!(status_of(AUTH_FORBIDDEN), StatusCode::FORBIDDEN);
        assert_eq!(status_of(REQ_MALFORMED), StatusCode::BAD_REQUEST);
        assert_eq!(status_of(REQ_ALG_UNSUPPORTED), StatusCode::BAD_REQUEST);
        assert_eq!(status_of(REQ_NOT_FOUND), StatusCode::NOT_FOUND);
        assert_eq!(status_of(REQ_TOO_LARGE), StatusCode::PAYLOAD_TOO_LARGE);
        assert_eq!(status_of(STORE_UNAVAILABLE), StatusCode::SERVICE_UNAVAILABLE);
        assert_eq!(status_of(STORE_UNKNOWN), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn dat_common_codes_split_by_whose_fault() {
        assert_eq!(status_of("DAT_CONFIG_ALG_UNSUPPORTED"), StatusCode::BAD_REQUEST);
        assert_eq!(status_of("DAT_TOKEN_EXPIRED"), StatusCode::BAD_REQUEST);
        assert_eq!(status_of("DAT_SIG_MISMATCH"), StatusCode::BAD_REQUEST);
        assert_eq!(status_of("DAT_CERT_MALFORMED"), StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(status_of("DAT_KEY_INVALID"), StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(status_of("DAT_INTERNAL_UNKNOWN"), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn unknown_code_is_a_server_error_not_a_client_error() {
        assert_eq!(status_of("something.we.never.defined"), StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(status_of(""), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn no_code_is_a_bare_number() {
        for code in [
            AUTH_UNAUTHORIZED, AUTH_FORBIDDEN, AUTH_DISABLED,
            REQ_MALFORMED, REQ_ALG_UNSUPPORTED, REQ_NOT_FOUND, REQ_TOO_LARGE, REQ_UNKNOWN,
            STORE_UNAVAILABLE, STORE_UNKNOWN,
        ] {
            assert!(code.starts_with("DAT_"), "{code} must start with DAT_");
            assert!(
                code.chars().all(|c| c.is_ascii_uppercase() || c == '_'),
                "{code} must be SCREAMING_SNAKE_CASE",
            );
        }
    }
}
