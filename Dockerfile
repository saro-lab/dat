FROM --platform=$BUILDPLATFORM rust:trixie AS builder

ARG TARGETPLATFORM
ARG TARGETARCH

RUN apt-get update && apt-get install -y musl-tools

RUN case "${TARGETARCH}" in \
        "amd64") \
            RUST_TARGET="x86_64-unknown-linux-musl" ;; \
        "arm64") \
            RUST_TARGET="aarch64-unknown-linux-musl" \
            ;; \
        *) \
            echo "Unsupported architecture: ${TARGETARCH}"; exit 1 ;; \
    esac && \
    rustup target add "${RUST_TARGET}" && \
    echo "${RUST_TARGET}" > /RUST_TARGET

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY .cargo ./.cargo
COPY src ./src

RUN RUST_TARGET=$(cat /RUST_TARGET) && \
    cargo build --release --target "${RUST_TARGET}" && \
    cp target/${RUST_TARGET}/release/dat-cms /app/dat-cms-bin

FROM scratch

WORKDIR /app

COPY --from=builder /app/dat-cms-bin /app/dat-cms

ENV PORT=80

EXPOSE 80
ENTRYPOINT ["/app/dat-cms"]
