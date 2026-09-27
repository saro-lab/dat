# syntax=docker/dockerfile:1.7
FROM rust:1.97.1-alpine3.22 AS builder

ARG TARGETARCH

RUN apk add --no-cache build-base ca-certificates cmake linux-headers
RUN mkdir -p /runtime/data

WORKDIR /work

COPY Cargo.toml Cargo.lock ./
COPY .cargo ./.cargo
COPY src ./src

RUN --mount=type=cache,target=/usr/local/cargo/registry,id=global-registry-${TARGETARCH} \
    --mount=type=cache,target=/usr/local/cargo/git,id=global-git-${TARGETARCH} \
    case "${TARGETARCH}" in \
        amd64) RUST_TARGET=x86_64-unknown-linux-musl ;; \
        arm64) RUST_TARGET=aarch64-unknown-linux-musl ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac && \
    RUSTFLAGS="-C target-feature=+crt-static" \
    cargo build --locked --release --features container --target "${RUST_TARGET}" && \
    cp "target/${RUST_TARGET}/release/dat-cms" /work/dat-cms

RUN apk add --no-cache libcap-setcap && \
    setcap 'cap_net_bind_service=+ep' /work/dat-cms

FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /work/dat-cms /dat-cms
COPY --from=builder --chown=10001:10001 /runtime/data /data

USER 10001:10001

EXPOSE 80
ENTRYPOINT ["/dat-cms"]
