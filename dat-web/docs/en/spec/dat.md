# DAT (Distributed Access Token)

## 1. Overview

As the number of concurrent users grows, the number of sessions grows with it, placing an excessive load on the session server.

**DAT** is a token specification devised to solve that session server load problem and to implement efficient authentication that shares no state between servers (stateless).

A DAT is a string made of **five fixed fields** separated by dots (`.`). Each field can be sliced out from the delimiter positions alone with no JSON parsing, and both the expiration time and an encrypted region are part of the specification itself.

---

## 2. Wire Format

<WireFormat
    title="DAT wire format"
    hint="Hover over a field to see its description."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Token expiration time. A decimal integer of Unixtime in seconds.'},
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'ID of the certificate to verify with. Written in lowercase hexadecimal.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Data exposed to the client. Anyone can decode it.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Encrypted data. Structured as IV (96 bits) + AES-GCM ciphertext; when there is nothing to encrypt it is an empty string.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signature over all four preceding fields. This field is what blocks tampering and forgery.'},
    ]"
/>

```
expire . cid . plain . secure . signature
```

| Field | Type | Encoding | Notes |
| --- | --- | --- | --- |
| `{{t('dat_expire')}}` | uint64 | decimal string | Unixtime (seconds) |
| `CID` | uint64 | hex string | Certificate ID |
| `{{t('dat_plain')}}` | Binary | Base64Url (no padding) | Public data |
| `{{t('dat_secure')}}` | Binary | Base64Url (no padding) | Encrypted data |
| `{{t('sig')}}` | Binary | Base64Url (no padding) | Signature |

<Struct type="dat" />

### 2.1. Field Specifications

`{{t('dat_expire')}}` : uint64 (Unix Time)
- Represents the token's expiration time as a 64-bit unsigned integer in seconds.
- **Only pure decimal digits are allowed.** A sign, whitespace, or a separator makes it a format error.

`CID` : Hex (uint64)
- The Certificate ID used to verify the token.
- **Only pure hexadecimal digits are allowed**, and the `0x` prefix is not used.

`{{t('dat_plain')}}` : Base64Url (Binary)
- Carries the data to expose to the client. It supports binary data as well as strings, and the client can decode and inspect it.
- **It is not encrypted.** Sensitive values must never be placed here.

`{{t('dat_secure')}}` : Base64Url (Binary)
- Carries the data to keep private from the client. It is encrypted with the certificate's encryption algorithm, so a client without the certificate cannot decrypt the contents.
- Its internal structure is `IV(96bit) + ciphertext`, and a fresh IV is generated for every encryption.

`{{t('sig')}}` : Base64Url (Binary)
- Signature data used to verify that the token has not been tampered with or forged. It is produced by signing the preceding fields with the certificate's signature algorithm.
- If signature verification fails, no field of the token may be trusted.

---

## 3. Canonical Rules

For clients implemented in many languages to **interpret the same token identically**, the rules below must not diverge between implementations. The reference implementation is Rust (`dat-rust`), and every other implementation is aligned to these rules.

### 3.1. Numeric Field Parsing

`expire` and `cid` are interpreted **strictly**. Every input below is rejected as a format error.

| Example input | Result | Reason |
| --- | --- | --- |
| `100` | accepted | pure decimal |
| `007` | accepted | leading zeros are allowed |
| `+100` | rejected | signs are not allowed |
| `-1` | rejected | signs are not allowed |
| `" 100 "` | rejected | whitespace is not allowed |
| `1_0` | rejected | separators are not allowed |
| `0x10` | rejected | prefixes are not allowed |
| `zzzz` | rejected | not a number |
| `""` | rejected | empty string |
| `18446744073709551616` | rejected | exceeds the uint64 range |

::: warning Why strictness is required
A lenient parser turns `-1` into the maximum uint64 value, producing a token that **effectively never expires**, or silently converts non-numeric values into `0`. If implementations differ in how lenient they are, the same token passes on one side and is rejected on the other, and interoperability breaks.
:::

### 3.2. Expiration Judgment

**DAT tokens and certificates use different expiration boundaries.** Do not confuse them.

| Subject | Valid while | Exactly at the expiration instant (`expire == now`) |
| --- | --- | --- |
| **DAT token** | `expire > now` | **rejected as expired** |
| **Certificate** | `expire >= now` | **still valid** |

A token becomes invalid the moment its expiration time arrives, while a certificate remains valid up to and including that instant. The certificate has to outlive the token by one tick so that a token issued right at the boundary can still be verified.

### 3.3. Empty secure Payload

When there is no data to encrypt, `secure` is an **empty string**.

- `encrypt(empty input)` → empty output (no IV and no GCM tag are attached)
- `decrypt(empty input)` → empty output
- If it is not empty but is no longer than the IV length (12 bytes), it is a **decryption error**.

```
1893456000.1a.SGVsbG8..T3RoZXItc2lnbmF0dXJl
                      ↑ a valid token whose secure slot is empty
```

---

## 4. Issuance and Verification

<FlowDiagram
    title="DAT issuance → delivery → verification"
    :legend="{req: 'Request', res: 'Response', sync: 'Certificate sync'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: 'Issuing server', kind: 'issuer'},
        {id: 'client', label: 'Client', kind: 'client'},
        {id: 'verifier', label: 'Verifying server', kind: 'node'},
    ]"
    :steps="[
        {from: 'cms', to: 'issuer', label: 'Distribute certificates', kind: 'sync'},
        {from: 'cms', to: 'verifier', label: 'Distribute certificates', kind: 'sync'},
        {from: 'client', to: 'issuer', label: 'Login', kind: 'req'},
        {from: 'issuer', label: 'issue(plain, secure)', kind: 'note'},
        {from: 'issuer', to: 'client', label: 'DAT issued', kind: 'res'},
        {from: 'client', to: 'verifier', label: 'Request with DAT attached', kind: 'req'},
        {from: 'verifier', label: 'Look up certificate by CID → verify signature → decrypt', kind: 'note'},
        {from: 'verifier', to: 'client', label: 'Response', kind: 'res'},
    ]"
/>

### 4.1. Issuance Procedure

1. Pick an **issuable** certificate from the ones the manager holds.
2. Compute `expire = now + dat_ttl_seconds`.
3. Encode `plain` as Base64Url, and encrypt `secure` before encoding it as Base64Url.
4. Sign the string `expire.cid.plain.secure` and append the result as the last field.

### 4.2. Verification Procedure

1. Split into 5 fields on the dot (`.`). A different field count is a format error.
2. Check `expire`. An expired token is rejected before signature verification.
3. Look up the certificate by `cid`. If it is missing, verification is impossible.
4. Verify the signature over the `expire.cid.plain.secure` range.
5. Only after verification succeeds, decrypt `secure`.

::: danger Do not trust values read before signature verification
Some implementations offer an API that pulls fields out without checking the signature (the `parse without verify` family). Those values are **entirely under the attacker's control** and must be used for logging and debugging only.
:::

---

## 5. Comparison with JWT

DAT and JWT (JSON Web Token) share a dot (`.`) delimited token structure and signature-based verification, but their internal designs differ in the following key ways.

### 5.1. Structural Comparison

* **JWT structure**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **DAT structure**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |


### 5.2. Key Differences

* **Binary-based lightweight design:** JWT handles its header and body as JSON strings, whereas DAT **works directly with binary data**, optimizing data size and improving parsing efficiency.
* **Built-in security (the `{{t('dat_secure')}}` field):** In JWT the payload is exposed as plaintext by default, so a separate specification such as JWE must be applied when encryption is needed. DAT, by contrast, **supports encryption natively through the `{{t('dat_secure')}}` field**.
* **Enforced expiration constraint:** In JWT the `exp` (claims) field is optional, but in DAT the **`{{t('dat_expire')}}` field is mandated by the token structure**, so validity checking is always performed.
* **No algorithm negotiation:** JWT carries the `alg` value in its own header, which creates an attack surface for algorithm confusion. In DAT the algorithm is **decided by the certificate**, and the token carries no algorithm information at all.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
