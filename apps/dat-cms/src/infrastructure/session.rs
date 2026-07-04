use crate::env::ENV;
use axum::body::Body;
use axum::extract::ConnectInfo;
use axum::http::{Request, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use std::net::{IpAddr, SocketAddr};
use saro_infra::error::{ApiError, ApiResult};

#[derive(Clone, Debug)]
pub struct Session {
    token: String,
    ip: IpAddr
}

impl Session {
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
        self.ip.clone()
    }

    fn is_allow(&self, allows: &Vec<String>) -> ApiResult<()> {
        if allows.is_empty() || (!self.token.is_empty() && allows.contains(&self.token)) {
            Ok(())
        } else {
            Err(ApiError::Unauthorized())
        }
    }
}

pub async fn session_layout(ConnectInfo(socket_addr): ConnectInfo<SocketAddr>, mut req: Request<Body>, next: Next, ) -> Result<Response, StatusCode> {
    let header = req.headers_mut();

    let ip = header.get("X-Forwarded-For")
        .and_then(|x| x.to_str().ok())
        .and_then(|x| x.split(',').next())
        .and_then(|x| x.trim().parse::<IpAddr>().ok())
        .unwrap_or_else(|| socket_addr.ip());

    let token = header.get("Authorization")
        .and_then(|x| x.to_str().ok())
        .map(|x| x.trim().to_string())
        .unwrap_or_else(|| "".to_string());

    let ext = req.extensions_mut();
    ext.insert(Session {
        token, ip
    });
    Ok(next.run(req).await)
}
