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
    match code {
        "DAT_CONFIG_ALG_UNSUPPORTED"
        | "DAT_CONFIG_URI_INVALID"
        | "DAT_CONFIG_ARGUMENT_INVALID"
        | "DAT_TOKEN_MALFORMED"
        | "DAT_TOKEN_EXPIRED"
        | "DAT_TOKEN_UNKNOWN"
        | "DAT_SIG_MISMATCH"
        | "DAT_SIG_MALFORMED"
        | "DAT_CRYPTO_TAG_MISMATCH"
        | "DAT_CRYPTO_DATA_INVALID" => StatusCode::BAD_REQUEST,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    }
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
        assert_eq!(
            status_of(STORE_UNAVAILABLE),
            StatusCode::SERVICE_UNAVAILABLE
        );
        assert_eq!(status_of(STORE_UNKNOWN), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn dat_common_codes_split_by_whose_fault() {
        for code in [
            "DAT_CONFIG_ALG_UNSUPPORTED",
            "DAT_CONFIG_URI_INVALID",
            "DAT_CONFIG_ARGUMENT_INVALID",
            "DAT_TOKEN_MALFORMED",
            "DAT_TOKEN_EXPIRED",
            "DAT_TOKEN_UNKNOWN",
            "DAT_SIG_MISMATCH",
            "DAT_SIG_MALFORMED",
            "DAT_CRYPTO_TAG_MISMATCH",
            "DAT_CRYPTO_DATA_INVALID",
        ] {
            assert_eq!(status_of(code), StatusCode::BAD_REQUEST, "{code}");
        }

        for code in [
            "DAT_CONFIG_UNKNOWN",
            "DAT_CERT_MALFORMED",
            "DAT_SIG_KEY_MISSING",
            "DAT_SIG_BACKEND",
            "DAT_SIG_UNKNOWN",
            "DAT_CRYPTO_BACKEND",
            "DAT_CRYPTO_UNKNOWN",
            "DAT_KEY_INVALID",
            "DAT_KEY_VERIFY_ONLY_UNSUPPORTED",
            "DAT_KEY_UNKNOWN",
            "DAT_INTERNAL_UNAVAILABLE",
            "DAT_INTERNAL_UNKNOWN",
        ] {
            assert_eq!(status_of(code), StatusCode::INTERNAL_SERVER_ERROR, "{code}");
        }
    }

    #[test]
    fn unknown_code_is_a_server_error_not_a_client_error() {
        assert_eq!(
            status_of("something.we.never.defined"),
            StatusCode::INTERNAL_SERVER_ERROR
        );
        assert_eq!(status_of(""), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn no_code_is_a_bare_number() {
        for code in [
            AUTH_UNAUTHORIZED,
            AUTH_FORBIDDEN,
            AUTH_DISABLED,
            REQ_MALFORMED,
            REQ_ALG_UNSUPPORTED,
            REQ_NOT_FOUND,
            REQ_TOO_LARGE,
            REQ_UNKNOWN,
            STORE_UNAVAILABLE,
            STORE_UNKNOWN,
        ] {
            assert!(code.starts_with("DAT_"), "{code} must start with DAT_");
            assert!(
                code.chars().all(|c| c.is_ascii_uppercase() || c == '_'),
                "{code} must be SCREAMING_SNAKE_CASE",
            );
        }
    }
}
