FROM rust:alpine AS builder

RUN apk add build-base cmake linux-headers

WORKDIR /work

COPY Cargo.toml Cargo.lock ./
COPY .cargo ./.cargo
COPY src ./src

RUN --mount=type=cache,target=/usr/local/cargo/registry,id=global-registry \
    --mount=type=cache,target=/usr/local/cargo/git,id=global-git \
    RUST_TARGET="$(uname -m)-unknown-linux-musl" && \
    RUSTFLAGS="-C target-feature=+crt-static" \
    cargo build --release --target "${RUST_TARGET}" && \
    cp "target/${RUST_TARGET}/release/dat-cms" /work/dat-cms

FROM scratch

WORKDIR /

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /work/dat-cms /dat-cms

ENV PORT=80

EXPOSE 80
ENTRYPOINT ["/dat-cms"]
