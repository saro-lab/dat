use axum::http::HeaderMap;
use std::net::IpAddr;

pub fn client_ip(headers: &HeaderMap, socket_ip: IpAddr) -> IpAddr {
    headers.get("X-Forwarded-For")
        .and_then(|x| x.to_str().ok())
        .and_then(|x| x.split(',').next())
        .and_then(|x| x.trim().parse::<IpAddr>().ok())
        .unwrap_or(socket_ip)
}
