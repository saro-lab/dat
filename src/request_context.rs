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

    fn is_allow(&self, allows: &[String]) -> ApiResult<()> {
        if allows.is_empty() || (!self.token.is_empty() && allows.contains(&self.token)) {
            Ok(())
        } else {
            Err(Api::unauthorized())?
        }
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
