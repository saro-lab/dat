# DAT Overview

DAT (Distributed Access Token) is a token specification for stateless authentication. One token
is a single ASCII string of **five dot-separated fields**:

```
expire . cid . plain . secure . signature
```

Any node holding the right certificate can verify a token on its own - no session store, no call
back to the issuer.

## The three things that are not optional

DAT exists because these three are optional in JWT, and optional security is the security that gets
skipped.

1. **Expiry is a field, not a claim.** `expire` is part of the wire format. A token without an
   expiration time cannot be represented, so "we forgot to set `exp`" cannot happen.
2. **Encryption is a region, not an add-on.** `secure` is encrypted with AES-GCM by construction.
   You do not implement JWE; you put the value in the second argument instead of the first.
3. **Key rotation is in the certificate.** A certificate carries the window during which it may
   issue. Once the window closes, that key cannot mint another token - no operator discipline
   required.

There is also a fourth property that comes for free: **the token carries no algorithm name.** The
certificate decides the algorithm, so the `alg`-confusion attack class from JWT has no surface here.

## Mental model

Three objects, and you only ever touch the first two.

| Object | What it is | Lifetime |
| --- | --- | --- |
| **Manager** | Holds certificates; `issue()` and `parse()` hang off it | One per process, long-lived |
| **Certificate** | Key material + issuance window + token TTL, identified by `cid` | Rotated on a schedule |
| **Token (DAT)** | The string you hand to a client | Seconds to hours |

Two ways to feed a manager:

- **`DatCmsManager`** - talks to a DAT CMS server, refreshes certificates on a timer. This is the
  production path. Certificates rotate without you doing anything.
- **`DatManager`** - you construct certificates yourself and import them. Use it in tests, in
  single-process tools, or when you distribute certificates by some other means.

`DatCmsManager` wraps a `DatManager` and exposes the same `issue`/`parse`; switching between them
is a change to initialization only.

## Roles in a cluster

```
                    DAT CMS
                   /        \
        full certs/          \verify-only certs
                 /            \
        Login server        Content servers
             |                    ^
     issue(plain, secure)         | request + DAT
             |                    |
             +------> Client -----+
```

- The **login/issuing server** syncs full certificates (signing private key included) and calls
  `issue()`.
- **Verifying servers** sync verify-only certificates and call `parse()`. They never need to know
  the issuing server exists.
- A verify-only ECDSA certificate cannot forge tokens. It **can** still decrypt `secure`, because
  the AES key is symmetric and ships in full either way. See
  [certificate.md](https://dat.saro.me/llms/certificate.md).

## plain vs secure - the one decision you make per field

| Put it in `plain` | Put it in `secure` | Put it nowhere |
| --- | --- | --- |
| user id, tenant id, role | internal ids, entitlements, anything you would not print in a client-side log | passwords, full card numbers, anything that must survive a stolen certificate |
| values the client is allowed to read | values only your servers should read | |

`plain` is Base64Url, not encryption. Anyone with the token reads it. `secure` is unreadable
without the certificate - but every node that can verify can also decrypt, so `secure` hides data
from *clients*, not from your own verification tier.

Both regions take arbitrary bytes. There is no schema, no JSON requirement, and no reserved key
names. Most services put a short delimited string or a compact binary struct in each.

## Getting a token to a client

DAT says nothing about transport. Treat it the way you would treat any bearer credential:
`Authorization: Bearer <dat>`, or an HttpOnly cookie. The token is opaque to the client apart from
the `plain` region.

## Clients

Every client implements the same wire format and shares one version line. A token issued by any of
them parses in all the others.

| Language | Package | Install |
| --- | --- | --- |
| Rust | `dat` | `dat = { version = "4.6.2" }` |
| Java / Kotlin | `me.saro:dat` | `implementation("me.saro:dat:4.6.2")` |
| JavaScript / TypeScript | `saro-dat` | `npm i saro-dat@4.6.1` |
| Python | `saro-dat` | `pip install "saro-dat~=4.6.2"` |
| C# | `saro-dat` | `dotnet add package saro-dat --version 4.6.1` |
| Go | `github.com/saro-lab/dat/dat-go/v4` | `go get github.com/saro-lab/dat/dat-go/v4@v4.6.0` |
| Ruby | `saro-dat` | `gem install saro-dat --version "~> 4.6.1"` |
| C / C++ | `dat` (vcpkg) | `find_package(dat CONFIG REQUIRED)` |

Patch numbers move independently per registry; check the registry for the newest one on the `4.6`
line. Per-language usage lives in the `platform-*.md` documents.

Rust (`dat-rust`) is the **reference implementation**. Where a behavioural question is not settled
by these documents, what Rust does is the answer.

## Where to go next

| You want to | Read |
| --- | --- |
| Add DAT to a service in language X | `platform-<x>.md` |
| Know exactly what bytes are on the wire | [token.md](https://dat.saro.me/llms/token.md) |
| Understand certificate windows and rotation | [certificate.md](https://dat.saro.me/llms/certificate.md) |
| Wire up automatic key rolling | [cms-sync.md](https://dat.saro.me/llms/cms-sync.md) |
| Decide what to do with a failure | [errors.md](https://dat.saro.me/llms/errors.md) |
| Structure an issuing tier and a verifying tier | [integration.md](https://dat.saro.me/llms/integration.md) |

## Glossary

- **cid** - certificate id, `uint64`, lowercase hex in the token. Immutable; a rotation gets a new
  cid, never a reused one.
- **issuance window** - `start .. start + duration`. Outside it, that certificate cannot issue.
- **dat ttl** - how long a token issued by that certificate stays valid.
- **issuance delay** - the gap between a certificate being created and becoming issuable, so every
  node has time to sync it first.
- **verify-only** - an export of a certificate with the signing private key stripped (ECDSA only).
- **MFS** - Maximum Fixed Secret: an HMAC secret sized to the hash output (256/384/512 bits).
