# DAT Certificate

## 1. Overview

The **DAT certificate** is the specification that controls DAT issuance authority and manages the signature and encryption algorithms of a token along with their key material.

Each certificate has a unique ID (`CID`), and it safely governs the token lifecycle by enforcing both the window in which DATs may be issued and the validity period (TTL) of the tokens it creates.

In DAT, **key rolling is not optional.** Because the issuance window is baked into the certificate at the specification level, no new token can be created with that certificate once the window has passed.

---

## 2. Certificate Structure

<WireFormat
    title="Certificate wire format"
    hint="Hover over a field to see its description."
    :segments="[
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'Unique certificate ID. Matched against the cid field of a DAT.'},
        {name: 'start', type: 'uint64 (decimal)', kind: 'meta', note: 'Issuance start time (Unixtime in seconds).'},
        {name: 'duration', type: 'uint64 (decimal)', kind: 'meta', note: 'Issuance window length in seconds. A duration, not an absolute time.'},
        {name: 'ttl', type: 'uint64 (decimal)', kind: 'meta', note: 'Validity period, in seconds, of the DATs issued with this certificate.'},
        {name: 'sig-alg', type: 'String', kind: 'plain', note: 'Name of the signature algorithm.'},
        {name: 'crypto-alg', type: 'String', kind: 'plain', note: 'Name of the encryption algorithm.'},
        {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Signature key. On a verify-only export, ECDSA emits the public key only.'},
        {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Encryption key. Because it is symmetric, it is always exported in full regardless of verify-only.'},
    ]"
/>

```
cid . start . duration . ttl . sig-alg . crypto-alg . sig-key . crypto-key
```

<Struct type="cert" />

### 2.1. Field Specifications

`CID` : Hex (uint64)

* The unique certificate ID that identifies the certificate. It is mapped to the `CID` field of a DAT to decide which certificate to use during verification.
* **The CID is an immutable identifier.** When rotating keys, do not reuse the same CID — issue a certificate with a new CID.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* The **start time**, in seconds, from which DATs may be issued with this certificate.

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* The certificate's **issuance validity window**. Once this many seconds have elapsed from `{{t('dat_issue_start')}}`, this certificate can no longer issue new DATs.
* **It is a duration, not an absolute time.** The end time is computed as `start + duration`.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* The validity period (Time To Live) of the DATs issued with this certificate. When a DAT is created, its `expire` value is set by adding this value to the issuance time.

`{{t('sig_alg')}}` : String / Enum

* The **signature algorithm** used to create and verify the `signature` field of a DAT.

`{{t('crypto_alg')}}` : String / Enum

* The **encryption algorithm** used to encrypt and decrypt the `secure` field of a DAT.

`{{t('sig_key')}}` : Base64Url (Binary)

* The key material used for signing and verification. (Depending on the algorithm it may be the public/private key of an asymmetric key pair, or a symmetric key.)

`{{t('crypto_key')}}` : Base64Url (Binary)

* The encryption key material used to encrypt and decrypt the `secure` field.

### 2.2. Time Calculation

```
end    = start + duration        issuance end time
expire = end + ttl               final certificate expiration time
```

* All arithmetic is performed in uint64, and **only overflow** is rejected as an error.
* `duration = 0` and `ttl = 0` are **legal values.** They can express a certificate whose issuance window closes immediately, or one that issues tokens invalidated the instant they expire.
* Since every field is an unsigned integer, **negative values do not exist by type.**

### 2.3. Constructor Signature

Every language implementation uses the following argument order.

```
(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,
 signature_key, crypto_key)
```

::: warning The third argument is a duration, not an end time
Passing an absolute end time as the third argument produces, with no error at all, **a certificate with a completely wrong validity window**, because the value goes straight into `start + duration`.
:::

---

## 3. Certificate Lifecycle

<CertTimeline
    title="The four phases of a certificate"
    caption="A certificate finally expires only after passing through the issuance delay, the issuance window, and the remaining DAT TTL."
    :marks="['Created', 'Issuance starts', 'Issuance ends', 'Final expiration']"
    :phases="[
        {label: 'Issuance delay (delay)', weight: 1.2, kind: 'delay', note: 'Time for every node to fetch the certificate'},
        {label: 'Issuable (duration)', weight: 3, kind: 'issue', note: 'DAT issuance and verification both possible'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: 'Issuance closed, verification only'},
    ]"
/>

| Phase | Issue | Verify | Judgment |
| --- | --- | --- | --- |
| Issuance delay | ✕ | ○ | `issuable() == false` |
| Issuable | ○ | ○ | `issuable() == true` |
| Remaining DAT TTL | ✕ | ○ | issuance window closed but not yet expired |
| After final expiration | ✕ | ✕ | `expired() == true` |

* **Issuability** is judged as `signable() && start <= now <= end`, and **both ends are inclusive**.
* Even after the issuance window closes, the certificate stays alive for `ttl` longer, because a token issued right before the window closed must be able to live out its own lifetime.
* The **issuance delay** phase exists to buy time for every node in the cluster to fetch the new certificate. For details, see the [{{t('menu_spec_cms')}}](./cms) document.

---

## 4. Algorithms

### 4.1. Signature Algorithms

The list of signature algorithms that protect a DAT against tampering and forgery. Both symmetric and asymmetric key schemes are supported.

| Name | Scheme | Notes |
| --- | --- | --- |
| `ECDSA-P256` | asymmetric | Elliptic Curve Digital Signature (NIST secp256r1) |
| `ECDSA-P384` | asymmetric | Elliptic Curve Digital Signature (NIST secp384r1) |
| `ECDSA-P521` | asymmetric | Elliptic Curve Digital Signature (NIST secp521r1) |
| `HMAC-SHA256-MFS` | symmetric | Keyed hashing based on a 256-bit fixed-size secret key |
| `HMAC-SHA384-MFS` | symmetric | Keyed hashing based on a 384-bit fixed-size secret key |
| `HMAC-SHA512-MFS` | symmetric | Keyed hashing based on a 512-bit fixed-size secret key |

> **MFS (Maximum Fixed Secret):** a scheme that uses a fixed-size secret key with the same number of bits as the output size of the hash algorithm.

### 4.2. Encryption Algorithms

The list of authenticated encryption algorithms that protect the confidential data inside a DAT (the `secure` field).

| Name | Key length | Structure |
| --- | --- | --- |
| `IV-AES128-GCM` | 128-bit | IV (96 bits) + encryption result |
| `IV-AES256-GCM` | 256-bit | IV (96 bits) + encryption result |

> **Built-in IV (Initialization Vector):** a unique 96-bit NONCE (IV), generated for every encryption operation, is joined to the front of the encryption result as a prefix. During decryption the leading 96 bits are split off as the IV and used to perform the decryption.

### 4.3. Key Length Validation

When a certificate is imported, **the bit count of the declared algorithm is checked against the actual key length**.

For example, if a certificate declaring `IV-AES256-GCM` contains a 16-byte key, the import itself is rejected. Without this check you would believe you are using AES-256 while actually running AES-128.

---

## 5. Verify-Only Export

A server that only performs verification has no need for the signing private key. For exactly this, DAT certificates provide a **verify-only export**.

<FlowDiagram
    title="Distribution paths of full and verify-only certificates"
    :legend="{req: 'Request', res: 'Response', sync: 'Certificate distribution'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: 'Issuing server', kind: 'issuer'},
        {id: 'verifier', label: 'Verify-only server', kind: 'node'},
    ]"
    :steps="[
        {from: 'issuer', to: 'cms', label: 'GET /v1/certs', kind: 'req'},
        {from: 'cms', to: 'issuer', label: 'Full certificate (includes the signing private key)', kind: 'sync'},
        {from: 'verifier', to: 'cms', label: 'GET /v1/certs/verify-only', kind: 'req'},
        {from: 'cms', to: 'verifier', label: 'Verify-only certificate', kind: 'sync'},
    ]"
/>

| Signature algorithm | `support_verify_only()` | Verify-only export result |
| --- | --- | --- |
| **ECDSA** family | `true` | the signature key is exported as the **public key only** (Base64 130 chars → 87 chars) |
| **HMAC** family | `false` | an **explicit error** is raised |

HMAC is a symmetric key, so a "key that can only verify" does not exist for it. An attempt at a verify-only export is therefore not silently skipped — it **fails loudly and immediately.** Because calling a verify-only export while HMAC certificates are mixed in will fail, use the ECDSA family if you operate verification-only nodes.

::: danger The encryption key is exported in full even in verify-only
The AES key for the `secure` field is a **symmetric key**, so it is **always exported in full**, regardless of verify-only — decryption requires the very same key that was used for encryption.

In other words, a server that receives a verify-only certificate:

* **cannot forge a signature** — without the private key it cannot create a new DAT.
* **can decrypt the `secure` payload** — no confidentiality is provided against it.

Verify-only is a mechanism for partitioning *issuance authority*, not *confidentiality*. If a value must be hidden from verification nodes, it must not be placed in `secure`.
:::

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
