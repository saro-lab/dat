# DAT Certificate

A certificate is what a manager holds. It carries the key material **and** the policy: when this
key may issue, and how long the tokens it issues live.

## Wire format

```
cid . start . duration . ttl . sig-alg . crypto-alg . sig-key . crypto-key
```

Exactly eight dot-separated fields.

| Field | Type | Meaning |
| --- | --- | --- |
| `cid` | uint64, hex | Unique certificate id; matched against a token's `cid` |
| `start` | uint64, decimal | Issuance start, Unixtime seconds |
| `duration` | uint64, decimal | **Length** of the issuance window in seconds |
| `ttl` | uint64, decimal | Lifetime of tokens issued by this certificate, in seconds |
| `sig-alg` | string | e.g. `ECDSA-P256` |
| `crypto-alg` | string | e.g. `IV-AES256-GCM` |
| `sig-key` | Base64Url | signing key; public-only on a verify-only export |
| `crypto-key` | Base64Url | AES key - **always full**, verify-only or not |

Certificates are exchanged as text, one per line. `manager.import(...)` takes that text;
`manager.import_certificates(...)` takes already-parsed objects.

## The third argument is a duration

Every client uses the same constructor order:

```
(cid, issuance_start_seconds, issuance_duration_seconds, dat_ttl_seconds, signature, crypto)
```

Passing an absolute end time as the third argument is accepted silently and produces a certificate
with a wildly wrong window, because the end is computed as `start + duration`. This is the single
most common mistake when building certificates by hand.

Also: **all times are Unix seconds.** Handing a millisecond timestamp to `start` places the
certificate tens of thousands of years in the future, where it never becomes issuable and never
errors.

## Time arithmetic

```
end    = start + duration      issuance stops here
expire = end + ttl             the certificate is finally dead here
```

- Everything is uint64. Only overflow is an error; negatives cannot exist by type.
- `duration = 0` and `ttl = 0` are legal - a window that shuts immediately, or tokens dead on
  arrival. Useful in tests.

## Lifecycle

```
created        issuance starts        issuance ends        final expiry
   |------ delay ------|---- duration ----|------ ttl ------|
   |   sync window     |  issue + verify  |   verify only   |
```

| Phase | Issue | Verify | Test |
| --- | --- | --- | --- |
| Issuance delay | no | yes | `issuable() == false` |
| Issuable | yes | yes | `issuable() == true` |
| Remaining TTL | no | yes | window closed, not expired |
| After final expiry | no | no | `expired() == true` |

- Issuability is `signable() && start <= now <= end` - **both ends inclusive**.
- The certificate stays alive `ttl` past the window's close so tokens minted at the last moment
  can live out their lifetime.
- The **delay** phase exists so every node in the cluster fetches the certificate before anyone
  issues with it. See [cms-sync.md](https://dat.saro.me/llms/cms-sync.md).

A manager picks its issuing certificate at import time. It does **not** re-check `issuable()` on
every `issue()` call - see "Intended behaviour" in cms-sync.md for why that matters during an
outage.

## Algorithms

### Signature

| Name | Kind | Notes |
| --- | --- | --- |
| `ECDSA-P256` | asymmetric | secp256r1 |
| `ECDSA-P384` | asymmetric | secp384r1 |
| `ECDSA-P521` | asymmetric | secp521r1 |
| `HMAC-SHA256-MFS` | symmetric | 256-bit fixed secret |
| `HMAC-SHA384-MFS` | symmetric | 384-bit fixed secret |
| `HMAC-SHA512-MFS` | symmetric | 512-bit fixed secret |

### Encryption

| Name | Key | Layout |
| --- | --- | --- |
| `IV-AES128-GCM` | 128-bit | 96-bit IV prefix + ciphertext + tag |
| `IV-AES256-GCM` | 256-bit | 96-bit IV prefix + ciphertext + tag |

A fresh IV is generated per encryption and prefixed to the output; decryption splits it back off.

Names must match the wire spelling exactly - `ECDSA-P256`, not `ES256`; `IV-AES256-GCM`, not
`A256GCM`. An unrecognized name is `DAT_CONFIG_ALG_UNSUPPORTED`.

### Choosing

- **Verification-only nodes in the fleet?** Use ECDSA. HMAC has no verify-only form, so an HMAC
  deployment gives every verifying node the power to mint tokens.
- **Single process, or every node trusted to issue?** HMAC is dramatically faster - roughly an
  order of magnitude on issue and parse compared to ECDSA-P256, and far more than that against
  P384/P521.
- **P384 / P521** cost several times what P256 costs for no practical gain in this setting. Pick
  P256 unless something external requires the larger curve.

### Key length is validated on import

The declared algorithm's bit count is checked against the actual key length. A certificate that
says `IV-AES256-GCM` while carrying a 16-byte key is rejected at import (`DAT_KEY_INVALID`) rather
than quietly running AES-128.

## Verify-only export

`exports(verify_only = true)` strips the signing private key.

| Signature family | `supportVerifyOnly()` | Result |
| --- | --- | --- |
| ECDSA | `true` | sig-key becomes the public key only |
| HMAC | `false` | hard error: `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` |

The failure is loud on purpose. Silently exporting a symmetric secret as if it were a "public key"
would hand out issuing power while the deployment believed it was locked down.

### What verify-only does and does not protect

A node with a verify-only certificate:

- **cannot forge** - no private key, so it cannot mint a token.
- **can decrypt `secure`** - the AES key is symmetric and is exported in full regardless.

Verify-only partitions **issuance authority**, not **confidentiality**. If a value must be hidden
from your own verification tier, it does not belong in `secure` at all.

## Rotation

- **Never reuse a cid.** The cid identifies key material; a new certificate gets a new cid.
- A certificate re-sent under an existing cid is discarded by the client, not merged.
- Overlap is automatic: the old certificate keeps verifying for its remaining `ttl` while the new
  one starts issuing. You do not need a dual-read window of your own.
- With a CMS in place, rotation is scheduled server-side and nothing in your application changes.
- Without a CMS, you are responsible for creating the next certificate before the current window
  closes; when it closes with no successor,
  `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` / `DAT_CERT_ISSUANCE_ENDED` is what you will see.

## Suggested numbers

Starting points, not requirements:

| Setting | Value | Reasoning |
| --- | --- | --- |
| sync interval | 60 s | Cheap; the response is small |
| issuance delay | 180-240 s | 3-4x the sync interval, so every node has the certificate first |
| duration | 1 h - 24 h | How often the signing key actually changes |
| dat ttl | 15 min - 1 h | Token lifetime; shorter means faster revocation-by-expiry |

The delay is the one to get right. Too short and a node issues with a certificate its peers have
not seen, and those peers answer `DAT_CERT_NOT_SYNCED` on perfectly good tokens.
