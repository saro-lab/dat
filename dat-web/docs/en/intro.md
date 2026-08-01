
# DAT (Distributed Access Token)

---

## Why DAT Was Created

Many systems today have adopted JWT, but the following structural limitations show up in real production environments.<br/>
DAT was designed as a new token specification to solve them.

#### 🧩 Fragmented Security Specifications and Lack of Enforcement
JWT offers encryption standards such as JWE, but their use is not enforced. <br/>
As a result, many development environments skip encryption altogether or transmit data in non-standard ways, creating security vulnerabilities.

#### 🔑 Security Risk of Static Keys
Signature key rolling is not mandatory, so a single key is frequently used for a long period. If that key is stolen, the security of the entire system can collapse — and breaches caused exactly this way have happened at large commerce sites.

#### 📉 Performance Degradation from Overhead
JWT goes through a JSON parsing pass on every request and consumes a considerable amount of CPU. In environments that demand high performance, this parsing cost can become the overall bottleneck of the system.

---

## Core Philosophy of DAT

DAT is designed on the principle that security must be enforced rather than optional, and that performance is not negotiable.

#### ⚡ Light and Fast

<WireFormat
    hint="Hover over a field to see its description."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Expiration time. Mandated by the specification, so it cannot be omitted.'},
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'ID of the certificate to verify with.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Data exposed to the client.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Encrypted data. It cannot be read without the certificate.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signature over the four preceding fields.'},
    ]"
/>

As shown above, a DAT has exactly five fixed fields separated by dots (`.`). Because the position of every field is fixed by the specification, each value can be sliced out just by locating the delimiters — no JSON parsing required.

#### 🔐 Enforced Security

DAT physically separates the plain region and the **encrypted (Secure)** region when transmitting data.<br/>
Sensitive information is required to be encrypted, and the whole process is protected by the standard algorithms declared in the certificate (ECDSA, AES-GCM, and so on).

The encryption algorithm is **decided by the certificate**, not by the token. Since the token carries no algorithm information, there is no attack surface for the algorithm confusion attacks that stem from JWT's `alg` header.

#### 🔄 Enforced Key Rolling

A DAT certificate directly manages the **key lifecycle**, not just token issuance and expiration.<br/>
"From when until when may this certificate issue tokens" is baked into the certificate at the specification level, so once that window passes, no new token can be created with it. A situation where an administrator carelessly keeps using one key for years simply cannot arise by construction.

#### ⏱️ Issuance Window Separated from Validity Period

"How long a certificate may issue tokens" and "how long an issued token stays alive" are two different values.<br/>
Because of that, tokens already issued can live out their full lifetime even after the certificate stops issuing, while the cluster naturally moves on to the next certificate in the meantime.

---

## Authentication Mechanism Comparison

| Category | **DAT**                       | **JWT** | **Session**           |
| --- |-------------------------------| --- |---------------------------|
| **Authentication model** | **Distributed verification**  | Distributed verification | Centralized          |
| **Data structure** | **Raw bytes<br/>(fixed-offset based)** | JSON<br/>(key-value, text based) | Serialized object<br/>(object serialization) |
| **Parsing mechanism** | **Direct byte mapping**       | Requires JSON parsing and type casting | Requires object deserialization and I/O          |
| **Processing performance** | **Highest (parsing overhead minimized)** | Moderate (depends on JSON processing performance) | Low (network/disk I/O)         |
| **Encryption** | **Built in**                  | Requires a separate JWE implementation (complex) | Not applicable                     |
| **Key management** | **System-enforced rolling (security enforced)** | Implemented by hand (risk of careless management) | Not applicable                     |
| **Key validity period** | **Mandated explicitly by the key specification** | Optional (permanent if unmanaged) | Managed by the central server                  |
| **Algorithm selection** | **Decided by the certificate (absent from the token)** | `alg` in the token header | Not applicable                     |
| **Expiration time** | **Mandatory field by specification** | Optional claim (`exp`) | Managed by the server                   |

---

## Next Documents

- [{{t('menu_spec_dat')}}](./spec/dat) — the token wire format and canonical rules
- [{{t('menu_spec_cert')}}](./spec/dat-certificate) — certificate structure, algorithms, and lifecycle
- [{{t('menu_spec_cms')}}](./spec/cms) — certificate distribution and behavior you need to know in operation

<script setup lang="ts">
import {useTranslate} from "../.vitepress/src/langs";
import WireFormat from "../.vitepress/ui/WireFormat.vue";
const {t} = useTranslate();
</script>
