use axum::http::HeaderMap;
use std::net::IpAddr;

pub fn forwarded_ip(headers: &HeaderMap) -> Option<IpAddr> {
    headers
        .get("X-Forwarded-For")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').find_map(|part| part.trim().parse().ok()))
}

pub fn client_ip(headers: &HeaderMap, socket_ip: IpAddr) -> IpAddr {
    forwarded_ip(headers).unwrap_or(socket_ip)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    #[test]
    fn first_valid_forwarded_address_wins() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "X-Forwarded-For",
            HeaderValue::from_static("unknown, 198.51.100.7, 203.0.113.9"),
        );

        assert_eq!(
            forwarded_ip(&headers),
            Some("198.51.100.7".parse().unwrap()),
        );
        assert_eq!(
            client_ip(&headers, "127.0.0.1".parse().unwrap()),
            "198.51.100.7".parse::<IpAddr>().unwrap(),
        );
    }

    #[test]
    fn socket_address_is_the_fallback() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "X-Forwarded-For",
            HeaderValue::from_static("unknown, invalid"),
        );
        let peer = "127.0.0.1".parse().unwrap();

        assert_eq!(forwarded_ip(&headers), None);
        assert_eq!(client_ip(&headers, peer), peer);
    }
}
