use crate::api::{Api, ApiResult};
use crate::client_ip::{client_ip, forwarded_ip};
use crate::env::ENV;
use axum::body::Body;
use axum::extract::ConnectInfo;
use axum::http::Request;
use axum::middleware::Next;
use axum::response::Response;
use std::net::{IpAddr, SocketAddr};

#[derive(Clone)]
pub struct RequestContext {
    token: String,
    ip: IpAddr,
    forwarded_ip: Option<IpAddr>,
    peer_ip: IpAddr,
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

    pub fn forwarded_ip(&self) -> Option<IpAddr> {
        self.forwarded_ip
    }

    pub fn peer_ip(&self) -> IpAddr {
        self.peer_ip
    }

    fn is_allow(&self, allows: &[String]) -> ApiResult<()> {
        if allows.is_empty() || allows.contains(&self.token) && !self.token.is_empty() {
            return Ok(());
        }

        if !self.token.is_empty() && ENV.token.is_known(&self.token) {
            Err(Api::forbidden())?
        }

        Err(Api::unauthorized())?
    }
}

pub async fn request_context_layer(
    ConnectInfo(socket_addr): ConnectInfo<SocketAddr>,
    mut req: Request<Body>,
    next: Next,
) -> Response {
    let ip = client_ip(req.headers(), socket_addr.ip());
    let forwarded_ip = forwarded_ip(req.headers());
    let peer_ip = socket_addr.ip();

    let token = req
        .headers()
        .get("Authorization")
        .and_then(|x| x.to_str().ok())
        .map(|x| x.trim().to_string())
        .unwrap_or_default();

    let ctx = RequestContext {
        token,
        ip,
        forwarded_ip,
        peer_ip,
    };
    tracing::debug!(
        client_ip = %ctx.ip(),
        peer_ip = %ctx.peer_ip(),
        forwarded_ip = ?ctx.forwarded_ip(),
        "REQUEST",
    );
    req.extensions_mut().insert(ctx);
    next.run(req).await
}
