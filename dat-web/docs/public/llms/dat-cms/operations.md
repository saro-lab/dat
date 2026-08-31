# DAT CMS — Operations Reference

This document targets DAT 4.7.x and later; the operational behavior below is unchanged across the 4.7.x line. Source-verified against `dat-cms/Dockerfile`, `dat-cms/src/env.rs`, `dat-cms/src/cron.rs`, and `dat-cms/src/services/cert_service.rs`.

## Container

The Dockerfile builds with the pinned `rust:1.97.1-alpine3.22` image (musl static target, `RUSTFLAGS=-C target-feature=+crt-static`) and produces a `scratch` runtime image containing only the static `dat-cms` binary and the CA certificate bundle copied from the builder.

- Runs as non-root `USER 10001:10001`.
- `ENV PORT=8088`; `EXPOSE 8088`.
- `ENTRYPOINT ["/dat-cms"]`.
- The scratch image has no shell, package manager, or in-container troubleshooting tools.
- Logs go to stdout/stderr only; collect them with the platform container runtime.

Example shape:

```shell
docker run --rm -p 8088:8088 \
  -v /host/dat-cms-data:/data \
  -e PORT=8088 -e DB_URI='sqlite:/data/data.db' \
  -e TOKEN_MASTER='masterToken' \
  -e TOKEN_CERT_FULL='fullToken' \
  -e TOKEN_CERT_VERIFY='verifyToken' \
  sarolab/dat-cms:4.7.x
```

The image already runs as UID/GID `10001`; mount `/data` writable by that UID/GID for SQLite.

## Environment variables

| Variable | Default | Behavior |
| --- | --- | --- |
| `HOSTNAME` | `localhost` | Used in log-file naming (`dat-<hostname>`) |
| `PORT` | `8088` | HTTP listen port |
| `DB_URI` | `sqlite:./data/data.db` | `sqlite:...`, `postgres:...`/`postgresql:...`, or `mysql:...` |
| `DB_CACHE_SECS` | `30` | Monotonic freshness window for the immutable certificate cache snapshot |
| `DB_QUERY_TIMEOUT_SECS` | `30` | Wall-clock bound for the certificate-list database query; `0` disables the bound |
| `DEBUG` | `1` in debug builds, `0` in release | Enables debug routes and default `SINGLE_NODE` test certificate |
| `LOG_CONSOLE` | `1` | Console logging on/off |
| `LOG_FILE` | unset | `JSON`, `TEXT`, or unset/other (off); files are written under `./logs` |
| `TOKEN_MASTER` / `TOKEN_CERT_FULL` / `TOKEN_CERT_VERIFY` | unset (empty) | Comma-separated alphanumeric tokens (`[A-Za-z0-9]+`); an empty list opens only that role's endpoints and logs `DAT_AUTH_DISABLED` |
| `SINGLE_NODE` | debug builds only: `HMAC-SHA512-MFS,IV-AES256-GCM`; empty in release | Starts a cron job that registers a certificate on schedule; see below |

Values must parse for their type or the process panics at startup with the invalid key/value named in the message.

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

`dat-cms` handles SIGTERM (and Ctrl+C): it stops the cron scheduler (if `SINGLE_NODE` is set) and closes the database before exiting. In Kubernetes: run as non-root (the image already sets UID/GID `10001`), mount a writable volume for SQLite, expose `8088` for HTTP and probes, inject token/database values as secrets, and configure a termination grace period long enough for the SIGTERM path to complete.

Windows is a required support target, but the native Windows build/runtime gate is still pending for lack of a usable native runner. PostgreSQL/MySQL/MariaDB CA-verification gates passed, including wrong-CA rejection, but target hostname and production certificate-chain validation remain deployment-specific. The parser, CMS sync, and CMS contract stress groups passed 1,000 repeated cycles; this bounded run does not replace an operational soak of deployment-defined duration and workload.
