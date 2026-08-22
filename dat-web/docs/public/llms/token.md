# DAT Token Format

## Wire format

```
expire . cid . plain . secure . signature
```

Exactly five fields, separated by `.` (U+002E). Any other count is a format error, not a partial
parse.

| Field | Type | Encoding | Meaning |
| --- | --- | --- | --- |
| `expire` | uint64 | decimal string | Unixtime **in seconds** at which the token dies |
| `cid` | uint64 | lowercase hex, no `0x` | Which certificate verifies this token |
| `plain` | bytes | Base64Url, no padding | Public data - anyone with the token reads it |
| `secure` | bytes | Base64Url, no padding | `IV(96-bit) || AES-GCM ciphertext`, or empty |
| `signature` | bytes | Base64Url, no padding | Signature over `expire.cid.plain.secure` |

Example:

```
1893456000.1a.SGVsbG8.k7Bx...ciphertext...zQ.MEUCIQ...sig...
```

The signature covers the first four fields **including their dots, as text**. Nothing outside the
token is mixed in: no headers, no algorithm name, no key id beyond `cid`.

## Canonical rules

These are the rules that keep every client interoperable. They are not implementation details -
divergence here means one node accepts a token another rejects.

### Numeric fields are parsed strictly

`expire` and `cid` accept digits and nothing else.

| Input | Result | Why |
| --- | --- | --- |
| `100` | accept | plain decimal |
| `007` | accept | leading zeros are fine |
| `+100`, `-1` | reject | signs are not allowed |
| `" 100 "` | reject | whitespace is not allowed |
| `1_0` | reject | separators are not allowed |
| `0x10` | reject | prefixes are not allowed |
| `zzzz` | reject | not a number |
| `` (empty) | reject | empty string |
| `18446744073709551616` | reject | out of uint64 range |

A lenient parser turns `-1` into `u64::MAX` and produces a token that effectively never expires.
That is why leniency is a spec violation and not a nicety.

### The expiry boundary differs for tokens and certificates

| Subject | Valid while | At the exact instant |
| --- | --- | --- |
| **Token** | `expire > now` | `expire == now` -> **expired** |
| **Certificate** | `expire >= now` | `expire == now` -> **still valid** |

The certificate deliberately outlives the token by one tick, so a token minted at the very last
moment is still verifiable.

### An empty secure region is legal

When there is nothing to encrypt, `secure` is the empty string - no IV, no GCM tag.

```
1893456000.1a.SGVsbG8..T3RoZXItc2lnbmF0dXJl
                      ^ empty secure, valid token
```

- `encrypt("")` -> `""`
- `decrypt("")` -> `""`
- non-empty but <= 12 bytes (the IV length) -> `DAT_CRYPTO_DATA_INVALID`

An empty `secure` produces no error code at all. Do not special-case it in calling code.

## Issuing

1. Pick an **issuable** certificate from the ones the manager holds.
2. `expire = now + certificate.dat_ttl`.
3. Base64Url-encode `plain`; encrypt `secure` with the certificate's crypto key, then Base64Url it.
4. Sign the string `expire.cid.plain.secure` and append the Base64Url signature.

Callers never do any of this by hand - `manager.issue(plain, secure)` is the whole API. What
matters is the consequence: **the TTL comes from the certificate, not from the call site.** There
is no per-token expiry argument. If you need a different lifetime, you need a different certificate.

## Verifying

1. Split on `.`; a count other than 5 is `DAT_TOKEN_MALFORMED`.
2. Check `expire`. Expired tokens are rejected **before** the signature is checked.
3. Look up the certificate by `cid`. Missing -> `DAT_CERT_NOT_FOUND` (or `DAT_CERT_NOT_SYNCED` when
   the CMS simply has not delivered it yet).
4. Verify the signature over `expire.cid.plain.secure`.
5. Only then decrypt `secure`.

`manager.parse(token)` does all five and hands back a payload with `plain` and `secure` decoded.

### parse-without-verify is for logs only

Rust, Go, Java/Kotlin, C# and C expose a variant (`parse_without_verify`, `ParseWithoutVerify`,
`parseWithoutVerifying`, `dat_manager_parse_without_verify`) that skips step 4. The JavaScript,
Python and Ruby clients deliberately do not.

The values it returns are **entirely attacker controlled**. Use it for debugging output and nothing
else. Never branch authorization on it.

One nuance: on that path the AES-GCM tag is the only integrity check left, which is why a tag
mismatch has its own code (`DAT_CRYPTO_TAG_MISMATCH`) rather than being folded into a generic
decryption failure.

## Size

There is no padding and no JSON, so a token is roughly:

```
len(expire) + len(cid) + ceil(4/3 | len(plain)) + ceil(4/3 | (12 + len(secure) + 16)) + sig + 4 dots
```

The `secure` region costs a fixed 28 bytes of overhead before Base64 (12-byte IV + 16-byte GCM
tag). Signature sizes: ECDSA-P256 64 bytes, P384 96, P521 132; HMAC 32/48/64.

Keep both regions small. A token travels on every request; it is not a database row.

## Comparison with JWT

| | DAT | JWT |
| --- | --- | --- |
| Structure | 5 fixed fields, byte regions | header/payload JSON |
| Parsing | slice at the dots | JSON parse + type cast |
| Expiry | mandatory field | optional `exp` claim |
| Encryption | built in (`secure`) | separate JWE spec |
| Algorithm | decided by the certificate, absent from the token | `alg` in the header |
| Key lifetime | enforced by the certificate | operator's problem |

The practical consequence for code generation: there are **no claims** in DAT. Do not look for
`sub`, `iss`, `aud`, or `scope`. Whatever structure you want inside `plain` and `secure` is yours
to define and parse.
