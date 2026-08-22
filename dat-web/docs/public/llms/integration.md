# Integration Patterns

How DAT fits into a real service. Language-neutral; the per-language calls are in `platform-*.md`.

## The shape of an integration

```
startup   ->  build one manager, keep it for the process lifetime
login     ->  manager.issue(plain, secure)  ->  hand the token to the client
request   ->  manager.parse(token)          ->  authorize from the payload
shutdown  ->  dispose/stop the manager
```

That is the whole surface. There is no middleware to register, no key file to load at request time,
and no refresh call to schedule - the CMS manager's timer does that.

## Two tiers

| Tier | Certificates | Calls | Token tier |
| --- | --- | --- | --- |
| Issuing (login, auth service) | full | `issue()`, and `parse()` if it also serves requests | full-cert |
| Verifying (everything else) | verify-only | `parse()` | verify-cert |

Use ECDSA if you run a verifying tier - HMAC has no verify-only form, so with HMAC every verifying
node can also mint tokens. See [certificate.md](https://dat.saro.me/llms/certificate.md).

A verifying node needs to know only the CMS address. It never talks to the issuing service.

**This split is opt-in.** A single-tier service - one application that both issues and verifies -
is the normal starting point, and it wants full certificates everywhere. Do not configure
`verifyOnly` unless the request describes a separate issuing service. See the verifyOnly rule in
[cms-sync.md](https://dat.saro.me/llms/cms-sync.md).

## Designing the payload

There are no claims. You choose the bytes.

**Keep it small and positional.** A token rides every request; a compact delimited string or a
packed struct beats JSON here - parsing overhead is the reason DAT exists.

```
plain  : "42|acme|admin"          user id, tenant, role - the client may read these
secure : "42|s-91af|billing:rw"   internal ids and entitlements - clients must not
```

Rules of thumb:

- Anything the client legitimately displays or routes on -> `plain`.
- Anything internal that must not leak through a client-side log -> `secure`.
- Anything that must survive a compromised certificate -> **not in the token at all**.
- Version your format from day one (a leading `1|`). You will change it, and old tokens stay in
  flight for a full TTL.

Both regions accept arbitrary bytes; text is the common case but not a requirement.

## Verifying a request

```
token = read Authorization: Bearer <token>, or the cookie
try:
    payload = manager.parse(token)
except DatError as e:
    if e.code == DAT_TOKEN_EXPIRED : 401 + "refresh"      # normal
    elif e.securityEvent           : 401 + security log   # forged
    else                           : 401                  # bad request
authorize using payload.plain / payload.secure
```

Three distinctions worth keeping:

1. **Expired is not forged.** An expired token means the client should refresh. Alerting on it is
   noise; roughly all of your users will hit it every day.
2. **`securityEvent` is exactly two codes.** `DAT_SIG_MISMATCH` and `DAT_CRYPTO_TAG_MISMATCH`.
   Those are worth a security log line and dropping the session. Everything else is a 400-class
   rejection.
3. **Never authorize on `parse_without_verify`.** Those values are attacker-controlled. Logging
   only.

## Token refresh

DAT has no built-in refresh token. The `expire` field comes from the certificate's `ttl`, so every
token from a given certificate has the same lifetime.

Common approach: short-lived DAT (15-60 min) plus your own longer-lived session record or refresh
credential at the login service. When the DAT expires, the client presents the refresh credential
and the login service issues a fresh DAT.

## Revocation

An issued DAT cannot be recalled - that is the price of distributed verification. Options, in
increasing cost:

1. **Short TTL.** A 15-minute TTL bounds the damage window at 15 minutes. This is usually enough.
2. **Deny list at the verifying tier.** Keyed on something in `plain` (a session id), checked
   against a small shared cache. Reintroduces shared state, so scope it to the users who actually
   need it.
3. **Certificate rotation.** Retiring a certificate kills every token issued under it. Blunt, but
   the right lever after a key compromise.

## Testing

Use `DatManager` directly - no CMS, no network:

1. Generate a certificate with `start = now - 10`, a generous `duration`, and a short `ttl`.
2. Import it.
3. `issue()` / `parse()` round-trip.

`start = now - 10` rather than `now` matters: with `start = now`, clock skew between the generating
line and the issuing line can land you in `DAT_CERT_NOT_YET_ISSUABLE`.

For expiry tests, `ttl = 0` produces a token that is already expired the moment it exists -
cheaper than sleeping.

For cross-language conformance, issue with one client and parse with another. Tokens are portable
by construction.

## Checklist of things that actually go wrong

| Mistake | Symptom |
| --- | --- |
| Millisecond timestamp passed as `start` | Certificate never becomes issuable, and never errors |
| Absolute end time passed as `duration` | Window is wrong by the length of the epoch. No error |
| Reused `cid` on rotation | The new certificate is discarded on import |
| Manager built per request | CMS traffic scales with request rate; certificate cache is thrown away |
| Retry loop around a permanent CMS error | Sustained load, and the token is still wrong |
| Startup blocked on the first sync | A CMS blip becomes a fleet-wide failure to boot |
| Issuing node given verify-only certificates | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` / `DAT_CERT_VERIFY_ONLY` |
| HMAC chosen with a verifying tier | Every verifying node can mint tokens |
| Sensitive value in `plain` | It was never encrypted; it is base64, not a cipher |
| Secret hidden in `secure` from your own nodes | Every verifying node holds the AES key |
| Issuance delay shorter than the sync interval | Steady `DAT_CERT_NOT_SYNCED` after each rotation |
| Alerting on `DAT_TOKEN_EXPIRED` | Constant noise; it is normal traffic |
| Authorizing on `parse_without_verify` | Complete authentication bypass |

## Performance notes

Measured on an Apple M4 (10 core), 10,000 issue+parse cycles with random payloads:

- HMAC (any size) - issue and parse in the single-digit milliseconds per 10,000 in Rust; roughly
  0.15 s per 10,000 in Node.
- ECDSA-P256 - a few times more expensive than HMAC on both.
- ECDSA-P384 / P521 - several times more expensive again. Avoid unless required externally.

The design consequence: parsing a DAT is cheap enough to do on every request without a cache. The
signature algorithm, not the parsing, is the cost. Pick P256 over P384/P521, and HMAC when the
whole fleet is trusted to issue.
