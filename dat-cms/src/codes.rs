//! DAT 서버 오류 코드 (error-cms.md).
//!
//! 코드 문자열은 공개 계약이다. 클라이언트는 이 코드를 **생성하지 않고 수신만** 하며,
//! 자기 쪽 `DAT_CMS_*` 로 감싸서 올린다.
//!
//! - `AUTH`/`REQ`/`STORE` 는 **HTTP 경계에서만** 나온다.
//! - 인증서를 발급·파싱할 때 나는 오류는 `dat` crate 의 `DAT_CERT_*`/`DAT_KEY_*`/
//!   `DAT_CONFIG_*` 를 그대로 쓴다. 서버 전용 코드를 새로 만들지 않는다.
//! - `code` 에 숫자를 넣지 않는다. 예전에는 `{"code":"401"}` 처럼 HTTP 상태를
//!   문자열로 실었고, 그래서 "토큰을 고쳐라"와 "이 엔드포인트는 권한 밖이다"를
//!   클라이언트가 구분할 수 없었다.

use axum::http::StatusCode;

pub const OK: &str = "ok";

// ---- AUTH : 요청자 (인증·권한) ----

/// 토큰 없음 또는 불일치 (401).
pub const AUTH_UNAUTHORIZED: &str = "DAT_AUTH_UNAUTHORIZED";
/// 토큰은 유효하나 이 등급으로는 접근 불가 (403).
pub const AUTH_FORBIDDEN: &str = "DAT_AUTH_FORBIDDEN";
/// 토큰 미설정으로 인증이 비활성 상태. **응답으로 나가지 않는 기동 경고**다.
pub const AUTH_DISABLED: &str = "DAT_AUTH_DISABLED";

// ---- REQ : 들어온 요청 (형식) ----

/// 경로·쿼리 파라미터·인자를 해석할 수 없음 (400).
pub const REQ_MALFORMED: &str = "DAT_REQ_MALFORMED";
/// 지원하지 않는 알고리즘 이름 (400). 예전에는 500 으로 나갔다.
pub const REQ_ALG_UNSUPPORTED: &str = "DAT_REQ_ALG_UNSUPPORTED";
/// 라우트 없음 또는 메서드 불일치 (404·405).
pub const REQ_NOT_FOUND: &str = "DAT_REQ_NOT_FOUND";
/// 본문 크기 초과 (413).
pub const REQ_TOO_LARGE: &str = "DAT_REQ_TOO_LARGE";
/// 미분류 요청 오류 (400).
pub const REQ_UNKNOWN: &str = "DAT_REQ_UNKNOWN";

// ---- STORE : 데이터베이스 ----

/// 연결 끊김·락 경합·타임아웃 (503). **일시적이다.**
///
/// 클라이언트가 백오프를 걸 수 있는 유일한 신호다. 예전에는 모든 DB 오류가 500
/// 하나여서, 모든 공식 클라이언트가 영구 오류에도 60초마다 무한 재시도했다.
pub const STORE_UNAVAILABLE: &str = "DAT_STORE_UNAVAILABLE";
/// 조회·쓰기·스키마·손상 실패 (500). 재시도가 무의미하다.
pub const STORE_UNKNOWN: &str = "DAT_STORE_UNKNOWN";

/// 오류 코드 문자열 → HTTP 상태.
///
/// 코드를 모르면 **500** 이다. 예전 `_ => BAD_REQUEST` 폴백은 서버 버그를 클라이언트
/// 입력 오류로 보고해, 호출부가 "내가 뭘 잘못 보냈나" 하고 고치려 들게 만들었다.
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

        // dat crate 의 공통 코드가 봉투로 그대로 나가는 경우. 서버 전용 코드로
        // 갈아치우지 않고 AREA 로 상태만 정한다.
        _ => dat_common_status(code),
    }
}

/// `dat` crate 공통 코드의 HTTP 상태.
///
/// 갈림은 **누구 잘못인가** 하나다. 호출자가 넘긴 값이면 400, 서버가 들고 있는
/// 재료(인증서·키·매니저·환경)면 500 이다.
fn dat_common_status(code: &str) -> StatusCode {
    // 호출자가 넘긴 값이 잘못된 경우.
    if code.starts_with("DAT_CONFIG_")
        || code.starts_with("DAT_TOKEN_")
        || code.starts_with("DAT_SIG_")
        || code.starts_with("DAT_CRYPTO_")
    {
        return StatusCode::BAD_REQUEST;
    }
    // DAT_CERT_* / DAT_KEY_* / DAT_MANAGER_* / DAT_INTERNAL_*, 그리고 미지의 코드.
    // 서버가 들고 있는 재료가 잘못됐거나 우리가 분류하지 못한 실패다.
    StatusCode::INTERNAL_SERVER_ERROR
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn server_codes_map_to_their_documented_status() {
        assert_eq!(status_of(OK), StatusCode::OK);
        assert_eq!(status_of(AUTH_UNAUTHORIZED), StatusCode::UNAUTHORIZED);
        // 403 은 이번에 신설했다. 예전에는 권한 등급 부족도 401 이었다.
        assert_eq!(status_of(AUTH_FORBIDDEN), StatusCode::FORBIDDEN);
        assert_eq!(status_of(REQ_MALFORMED), StatusCode::BAD_REQUEST);
        // 미지원 알고리즘이 500 에서 400 으로 옮겨 온 자리.
        assert_eq!(status_of(REQ_ALG_UNSUPPORTED), StatusCode::BAD_REQUEST);
        assert_eq!(status_of(REQ_NOT_FOUND), StatusCode::NOT_FOUND);
        assert_eq!(status_of(REQ_TOO_LARGE), StatusCode::PAYLOAD_TOO_LARGE);
        // 503 도 신설. 클라이언트가 백오프를 걸 수 있는 유일한 신호다.
        assert_eq!(status_of(STORE_UNAVAILABLE), StatusCode::SERVICE_UNAVAILABLE);
        assert_eq!(status_of(STORE_UNKNOWN), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn dat_common_codes_split_by_whose_fault() {
        // 호출자가 넘긴 값.
        assert_eq!(status_of("DAT_CONFIG_ALG_UNSUPPORTED"), StatusCode::BAD_REQUEST);
        assert_eq!(status_of("DAT_TOKEN_EXPIRED"), StatusCode::BAD_REQUEST);
        assert_eq!(status_of("DAT_SIG_MISMATCH"), StatusCode::BAD_REQUEST);
        // 서버가 들고 있는 재료.
        assert_eq!(status_of("DAT_CERT_MALFORMED"), StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(status_of("DAT_KEY_INVALID"), StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(status_of("DAT_INTERNAL_UNKNOWN"), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn unknown_code_is_a_server_error_not_a_client_error() {
        // 예전에는 미지 코드가 전부 400 으로 폴백해, 서버 버그가 클라이언트 입력
        // 오류로 보고됐다.
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
