# CMS Synchronization (client side)

`DatCmsManager` is the production entry point. It fetches certificates from a DAT CMS server on a
timer and keeps an internal `DatManager` up to date, so key rotation happens with no application
code involved.

It exposes the same `issue` / `parse` as `DatManager`. Choosing between them is an initialization
decision and nothing more.

## Configuration

Every client offers the same builder, spelled per language convention.

| Option | Default | Meaning |
| --- | --- | --- |
| uri / url / host+port | `http://localhost:8088` | CMS base address |
| token | none | Sent verbatim as the `Authorization` header |
| verifyOnly | `false` | `true` selects the verify-only endpoint. **Leave it off unless asked** |
| intervalSeconds / interval | 60 s | Auto-sync period |
| intervalOff | - | Disables the background timer; you call `sync()` yourself |
| logger | none | Optional; sync progress and failures go here |

### Leave verifyOnly off by default

**Do not enable `verifyOnly` unless the request explicitly says this node only verifies and never
issues tokens.** When it is unclear, leave it off.

A verify-only node cannot issue. Turning the flag on "just in case" produces a service that starts
cleanly, syncs cleanly, and then fails every login with
`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` / `DAT_CERT_VERIFY_ONLY` - a failure that looks like a bug in
the library rather than a configuration choice. Off is the safe default: an issuing certificate
verifies as well, so a node that holds one can do both.

Turn it on only when all three are true: there is a separate issuing service, this node never calls
`issue()`, and the signature algorithm is ECDSA (HMAC has no verify-only form at all).

### The URI must be scheme + host + port only

```
http://cms.internal:8088      OK
https://cms.internal          OK
http://cms.internal:8088/api  BAD path
http://cms.internal:8088/?x=1 BAD query
ftp://cms.internal            BAD scheme
```

Anything else is `DAT_CONFIG_URI_INVALID` at build time. The client appends the endpoint path
itself, choosing `/v1/certs` or `/v1/certs/verify-only` from the `verifyOnly` flag.

### Builder spelling by language

| Language | Build call | Notes |
| --- | --- | --- |
| Rust | `DatCmsManager::builder().url(..)?.interval(Duration).build().await` | returns `Arc<DatCmsManager>` |
| Java / Kotlin | `DatCmsManager.builder().uri(..).intervalSeconds(60).build()` | |
| JavaScript | `await DatCmsManager.builder().uri(..).intervalSeconds(60).build()` | async |
| Python | `DatCmsManager.builder().uri(..).interval_seconds(60).build()` | |
| C# | `await DatCmsManager.Builder().Host(..).Port(..).BuildAsync()` | also `.Uri(..)`; `IDisposable` |
| Go | `dat.NewDatCmsManagerBuilder().Url(..)` then `.Interval(d).Build()` | `Url` returns `(builder, error)` |
| Ruby | `Saro::Dat::DatCmsManager.builder.uri(..).interval_seconds(60).build` | |
| C | `dat_cms_manager_create(url, token, verify_only, interval_seconds, log_fn, ud, &out)` | no builder |

## One manager per process

The manager owns a background timer and an HTTP client, and holds every certificate. Create it once
at startup, keep it in a singleton / DI container / `OnceLock`, and share it. Creating one per
request multiplies your CMS traffic by your request rate and throws away the certificate cache.

Where the client is disposable (C#, C) or stoppable (JavaScript, Python, Ruby, Go), shut it down on
process exit so the timer and connections are released.

## Startup never fails on a sync failure

This is the single most important behavioural rule, and it is the same in every client:

> **Building the manager does not throw when the first sync fails.** You get a manager with no
> certificates, and it recovers on a later tick.

A CMS outage must not stop your fleet from booting. The failure is kept as queryable state instead:

| Language | Read it with |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java / Kotlin | `manager.lastError()` |
| C# | `manager.LastError` |
| C | `dat_cms_manager_last_error(manager)` |

It holds `DAT_CMS_NOT_SYNCED` until the first sync succeeds, and is empty/`null` when healthy.

So the correct startup sequence is:

1. Build the manager.
2. Ask for `lastError`.
3. If it is set and its `retry` is **permanent**, log loudly and page someone - a bad token or a
   wrong URL will never clear on its own.
4. If it is **transient**, carry on. The next tick probably fixes it.

Do not block startup on a successful sync, and do not retry-loop around `build()`.

## The sync protocol

| Endpoint | Purpose |
| --- | --- |
| `GET /v1/certs?version=N` | Full certificates, signing private key included |
| `GET /v1/certs/verify-only?version=N` | Verification-only certificates |
| `GET /v1/certs.json`, `/v1/certs/verify-only.json` | Same content as JSON |
| `POST /v1/cert/{sig-alg}/{crypto-alg}/{delay}/{duration}/{ttl}` | Manual creation (master token) |
| `GET /health` | Health check |

The response is plain text. **First line is the server's version**, the rest is one certificate per
line:

```
1712345678
1a.1712345000.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
2b.1712348600.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
```

One cycle, exactly as the reference implementation runs it:

1. Send the last successfully applied `version` as a query parameter, with the token in
   `Authorization`.
2. Non-2xx -> map to a `DAT_CMS_*` code, record it, stop. The version does not move.
3. Read the version line. Not plain decimal -> `DAT_CMS_MALFORMED`.
4. **Empty certificate list -> stop here and keep the current version.** Nothing changed.
5. Import the received certificates, **merging** them into what is already held. Existing
   certificates are not dropped; a certificate arriving under a cid already present is discarded
   rather than replacing it.
6. Only if the import succeeded, advance the stored version.

If the server reports a version *older* than the client's - a CMS replacement, a database reset -
the client accepts it and resynchronizes from that point; the server sends the whole set in that
case.

Advancing the version only on success is what stops a failed cycle from skipping certificates
permanently.

## Access tokens

The CMS partitions access into three tiers: a master token (certificate creation), a full-cert
token (`/v1/certs`), and a verify-cert token (`/v1/certs/verify-only`). A node that only verifies
should hold only the verify-cert token.

Note that a verify-only response still carries the full AES key - see the verify-only section of
[certificate.md](https://dat.saro.me/llms/certificate.md).

## Intended behaviour that looks like a bug

### Issuing continues after the issuance window closes

The manager selects its issuing certificate at import time and does not re-check `issuable()` on
every call.

If the CMS is unreachable while the window closes, re-checking would stop logins fleet-wide at that
instant. DAT chose the opposite: keep issuing with the cached certificate. Those tokens still
verify everywhere until the certificate's final expiry. A degraded service beats a dead one.

### `DAT_CERT_NOT_SYNCED` right after a rotation

A node that has not received the new cid yet cannot verify tokens carrying it. This is exactly what
the **issuance delay** prevents - set it to 3-4x your sync interval. If you see this code steadily
rather than in a brief burst, the delay is too short or one node's sync is broken.

### `DAT_CMS_SYNC_IN_PROGRESS`

A tick fired while the previous sync was still running, so it was skipped. Its retry class is
`state`: not a failure, nothing to do.

## Monitoring

Three signals are worth wiring up:

| Signal | Why |
| --- | --- |
| `lastError` is non-empty for more than a few intervals | Certificates are no longer being refreshed. This ends in an outage when the current one expires |
| `lastError.retry == permanent` | Will never self-heal. Bad token, wrong URL, unparseable response |
| consecutive `DAT_CMS_UNREACHABLE` / `DAT_CMS_SERVER_ERROR` count | Individually partial, but a long run escalates to critical |

Do not alert on a single failed cycle. Do alert on a stalled rollout.

## Without a CMS

`intervalOff` plus manual `sync()` lets you drive synchronization from your own scheduler. If there
is no CMS at all, use `DatManager` directly and import certificates you distribute by other means -
but then certificate rotation is your responsibility, and nothing will remind you when a window
closes.
