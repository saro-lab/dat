use crate::api::{Api, ApiResult};
use crate::client_ip::client_ip;
use crate::env::ENV;
use axum::body::Body;
use axum::extract::ConnectInfo;
use axum::http::Request;
use axum::middleware::Next;
use axum::response::Response;
use std::net::{IpAddr, SocketAddr};

#[derive(Clone, Debug)]
pub struct RequestContext {
    token: String,
    ip: IpAddr,
}

impl RequestContext {
    pub fn is_master(&self) -> ApiResult<()> {
        self.is_allow(&ENV.token.master)
    }
    pub fn is_cert_full(&self) -> ApiResult<()> {
        self.is_allow(&ENV.token.cert_full)
    }
    pub fn is_cert_verify(&self) -> ApiResult<()> {
        self.is_allow(&ENV.token.cert_verify)
    }
    pub fn ip(&self) -> IpAddr {
        self.ip
    }

    /// 인증 실패(401)와 권한 부족(403)을 가른다.
    ///
    /// 예전에는 토큰 미제공·토큰 불일치·권한 등급 부족이 전부 401 하나였다.
    /// 셋의 대응이 다르다 — 앞의 둘은 토큰을 고쳐야 하고, 마지막은 이 엔드포인트가
    /// 애초에 이 토큰의 권한 밖이라 토큰을 아무리 고쳐도 소용없다.
    fn is_allow(&self, allows: &[String]) -> ApiResult<()> {
        // 토큰 미설정 = 전면 개방. 기동 시 DAT_AUTH_DISABLED 로 경고한다(env.rs).
        if allows.is_empty() || allows.contains(&self.token) && !self.token.is_empty() {
            return Ok(());
        }

        // 어느 등급에든 등록된 토큰이면 토큰 자체는 유효하다. 이 자원에 대한
        // 권한만 없는 것이므로 403 이다.
        if !self.token.is_empty() && ENV.token.is_known(&self.token) {
            Err(Api::forbidden())?
        }

        // 토큰이 없거나 어느 등급에도 없다 — 401.
        Err(Api::unauthorized())?
    }
}

pub async fn request_context_layer(ConnectInfo(socket_addr): ConnectInfo<SocketAddr>, mut req: Request<Body>, next: Next) -> Response {
    let ip = client_ip(req.headers(), socket_addr.ip());

    let token = req.headers().get("Authorization")
        .and_then(|x| x.to_str().ok())
        .map(|x| x.trim().to_string())
        .unwrap_or_default();

    req.extensions_mut().insert(RequestContext { token, ip });
    next.run(req).await
}
