FROM rust:trixie AS builder

RUN apt-get update && apt-get install -y musl-tools

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY .cargo ./.cargo
COPY src ./src

RUN cargo build --release
RUN cp target/release/dat-cms dat-cms

FROM scratch

WORKDIR /app

COPY --from=builder /app/dat-cms /app/dat-cms

ENV PORT=80

EXPOSE 80
ENTRYPOINT ["/app/dat-cms"]
