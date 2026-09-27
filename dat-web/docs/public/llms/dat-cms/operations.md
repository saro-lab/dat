# DAT CMS — Operations Reference

This document targets DAT 4.7.1 and later; all releases sharing the same minor version (4.7.x) are fully wire- and API-compatible. Source-verified against `dat-cms/Dockerfile`, `dat-cms/src/env.rs`, `dat-cms/src/cron.rs`, and `dat-cms/src/services/cert_service.rs`.

## Container

The Dockerfile builds with the pinned `rust:1.97.1-alpine3.22` image (musl static target, `RUSTFLAGS=-C target-feature=+crt-static`) and produces a `scratch` runtime image containing the static `dat-cms` binary, the CA certificate bundle, and an empty `/data` directory owned by UID/GID `10001:10001`.

- Runs as non-root `USER 10001:10001`.
- The image binary carries `cap_net_bind_service=ep` so the non-root user can bind to port 80.
- Built with the `container` Cargo feature: the HTTP listen port is fixed at `80`, and `PORT` is ignored. `EXPOSE 80`.
- `ENTRYPOINT ["/dat-cms"]`.
- The scratch image has no shell, package manager, or in-container troubleshooting tools.
- Logs go to stdout/stderr only; collect them with the platform container runtime.

Publish container port 80 with Docker/Podman `-p HOST_PORT:80`.

Example:

```shell
docker run --rm -p 8088:80 \
  -v /host/dat-cms-data:/data \
  -e DB_URI='sqlite:/data/data.db' \
  -e TOKEN_MASTER='masterToken' \
  -e TOKEN_CERT_FULL='fullToken' \
  -e TOKEN_CERT_VERIFY='verifyToken' \
  sarolab/dat-cms:4.7.1
```

With `DB_URI` omitted, the image starts with SQLite at `/data/data.db` without a volume mount. To retain the database when replacing the container, mount persistent storage at `/data`, writable by UID/GID `10001:10001`.

## Environment variables

| Variable | Default | Behavior |
| --- | --- | --- |
| `HOSTNAME` | `localhost` | Used in log-file naming (`dat-<hostname>`) |
| `PORT` | `8088` (standalone binary) | Sets the HTTP listen port only for standalone binaries; container builds always listen on `80` and ignore this variable |
| `DB_URI` | `sqlite:./data/data.db` | `sqlite:...`, `postgres:...`/`postgresql:...`, or `mysql:...` |
| `DB_CACHE_SECS` | `30` | Monotonic freshness window for the immutable certificate cache snapshot |
| `DB_QUERY_TIMEOUT_SECS` | `30` | Wall-clock bound for the certificate-list database query; `0` disables the bound |
| `DEBUG` | `1` in debug builds, `0` in release | Enables debug routes and default `SINGLE_NODE` test certificate |
| `LOG_CONSOLE` | `1` | Console logging on/off |
| `LOG_FILE` | unset | `JSON`, `TEXT`, or unset/other (off); files are written under `./logs` |
| `TOKEN_MASTER` / `TOKEN_CERT_FULL` / `TOKEN_CERT_VERIFY` | unset (empty) | Comma-separated alphanumeric tokens (`[A-Za-z0-9]+`); an empty list opens only that role's endpoints and logs `DAT_AUTH_DISABLED` |
| `SINGLE_NODE` | debug builds only: `HMAC-SHA512-MFS,IV-AES256-GCM`; empty in release | Starts a cron job that registers a certificate on schedule; see below |

Values must parse for their type or the process panics at startup with the invalid key/value named in the message. Container builds do not parse `PORT`.

For a standalone binary, use `PORT=9090 ./dat-cms` to listen on 9090. Without `PORT`, standalone builds listen on 8088. Build standalone binaries without the `container` feature.

## `SINGLE_NODE` scheduled certificate registration

When `SINGLE_NODE` is non-empty, `dat-cms` registers one certificate immediately at startup and then on a cron schedule, without requiring `POST /v1/cert/...` calls. Two forms:

```text
# short form: just algorithms, default schedule/timing
signature_algorithm,crypto_algorithm
# e.g. HMAC-SHA512-MFS,IV-AES256-GCM

# detailed form
signature_algorithm,crypto_algorithm,cron,delay_seconds,duration_seconds,ttl_seconds
# e.g. HMAC-SHA512-MFS,IV-AES256-GCM,0 0/30 * * * *,1200,10800,600
```

The short form defaults to cron `0 0/30 * * * *`, `delay=1200`, `duration=10800`, `ttl=600`. Algorithm names and the register-command arguments (delay `>= 0`, duration/ttl `> 0`, all `<= 315360000`) are validated at startup; an invalid value panics the process before it starts serving. If the initial registration fails (e.g. the database schema is not ready), the scheduler does not start and the server fails to come up. This is intended for a single-node/test deployment that self-provisions a rotating certificate; multi-node deployments should provision certificates explicitly through `POST /v1/cert/...` instead.

## Database

Omitting `DB_URI` selects `sqlite:./data/data.db`. For file-backed SQLite, CMS creates missing parent directories before connecting and lets the driver create the database file; existing databases are preserved. URI query parameters and percent-encoded paths are interpreted by the SQLite driver. In-memory SQLite connections do not create directories or files.

| Database | URI example |
| --- | --- |
| SQLite | `sqlite:/data/data.db` |
| PostgreSQL | `postgresql://user:password@host/database` |
| MySQL | `mysql://user:password@host/database` |

Use secret injection for credentials, never command history. SQLite, PostgreSQL 17, MySQL 8.4, and MariaDB 12 are all supported over CA-verified TLS, including rejection of an unrelated CA. Deployment-specific hostname, certificate-chain, proxy, network, storage, and backup validation remain the deployer's responsibility.

## Transaction and cache guarantees

- Certificate registration (cleanup of rows older than a 30-day retention window, issuance-window selection, key generation, row insert) runs inside one database transaction, retried up to 3 total attempts with 5 ms then 10 ms backoff only for MySQL deadlock (`1213`) or serialization-conflict (`40001`) errors. Other errors are not retried.
- On success the transaction commits, then the certificate cache is invalidated (commit-then-invalidate order, not the reverse).
- On failure the transaction rolls back; a rollback failure is logged separately as `DAT_STORE_UNKNOWN` without masking the original error.
- A rolled-back registration may leave an auto-increment gap; the CMS version is a monotonic cursor derived from the certificate rows present, not a row count, so gaps do not break client synchronization.
- Certificate-list reads use immutable cache snapshots freshness-checked with a monotonic clock (`Instant`), not wall-clock time. Refreshes are serialized by a dedicated mutex with a double-check after acquiring it, so concurrent readers do not race a refresh.
- If a refresh fails or exceeds `DB_QUERY_TIMEOUT_SECS` and a previously successful snapshot exists, the server logs the failure and continues serving that last-known-good snapshot for another `DB_CACHE_SECS` window. If no successful snapshot exists yet, it returns `503 DAT_STORE_UNAVAILABLE`. This last-known-good fallback cannot deadlock against the same cache lock used by normal refreshes.
- `DB_QUERY_TIMEOUT_SECS = 0` disables the query wall-clock bound entirely (queries wait indefinitely instead of returning `DAT_STORE_UNAVAILABLE` on timeout).

## Shutdown and deployment

`dat-cms` handles SIGTERM (and Ctrl+C): it stops the cron scheduler (if `SINGLE_NODE` is set) and closes the database before exiting. In Kubernetes: run as non-root (the image already sets UID/GID `10001`), mount a writable volume for SQLite, keep `containerPort`, health probes, and Service `targetPort` at `80`, change the Service `port` to select the client-facing port, grant the container `NET_BIND_SERVICE` for non-root binding to port 80, inject token/database values as secrets, and configure a termination grace period long enough for the SIGTERM path to complete.

Windows is a required support target, but the native Windows build/runtime gate is still pending for lack of a usable native runner. PostgreSQL/MySQL/MariaDB CA-verification gates passed, including wrong-CA rejection, but target hostname and production certificate-chain validation remain deployment-specific. The parser, CMS sync, and CMS contract stress groups passed 1,000 repeated cycles; this bounded run does not replace an operational soak of deployment-defined duration and workload.
