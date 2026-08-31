# DAT CMS — Overview

This document targets DAT 4.7.x and later. Any release sharing the same minor version (4.7.x) is fully wire- and API-compatible: the protocol, CMS contract, and error-code meanings are unchanged across the 4.7.x line.

For the full DAT wire protocol and CMS v1 contract shared by every platform, read [https://dat.saro.me/llms.txt](https://dat.saro.me/llms.txt) first. This document only covers what is specific to the `dat-cms` server implementation.

## What dat-cms is

`dat-cms` is the DAT Certificate Management Service: an HTTP server (Rust, `axum`) that creates, stores, and distributes DAT certificates through the CMS v1 API. It is a standalone binary with no client-side code; every DAT client library (`dat-rust`, `dat-go`, `dat-maven`, `dat-npm`, `dat-nuget`, `dat-pypi`, `dat-ruby`, `dat-vcpkg`) can optionally synchronize against it.

## Why it is optional

The DAT wire protocol does not require CMS. A deployment may distribute certificates through another trusted channel (configuration management, a secrets store, a different internal service) and never run `dat-cms`. CMS exists to automate certificate creation, versioned distribution, and periodic client refresh — nothing in the DAT token or certificate grammar depends on it.

## Core objects this server owns

| Object | Contract |
| --- | --- |
| Certificate row | One persisted DAT certificate (`cid`, issuance window, TTL, algorithms, keys), stored in SQLite/PostgreSQL/MySQL |
| Version cursor | A monotonically increasing `i64` assigned as certificates are registered; clients synchronize with `?version=N` |
| Role | One of `TOKEN_MASTER` (create certificates, read server version), `TOKEN_CERT_FULL` (read full certificates), `TOKEN_CERT_VERIFY` (read verify-only certificates) |
| Cache snapshot | An immutable, monotonic-clock-timed in-memory snapshot of non-expired certificates, refreshed on a TTL and invalidated after a successful registration |

See [api.md](./api.md) for the endpoint contract, [operations.md](./operations.md) for deployment/runtime configuration, and [errors.md](./errors.md) for the server-side error catalog.
