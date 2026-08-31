# Certificates

A DAT certificate expresses the time ranges, algorithms, and keys required to issue and verify tokens as a single string.

<WireFormat
  hint="A certificate also consists of dot-separated ASCII fields in a fixed order."
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'Immutable certificate ID'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'Issuance start time'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'Issuance period'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'DAT lifetime'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'Signature algorithm'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Encryption algorithm'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Signing or verification key'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Encryption key'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## Time ranges

<CertTimeline />

- A certificate can issue DATs from `start` through `start + duration`, including both endpoints.
- An issued DAT is valid for `ttl` from its issuance time.
- The certificate is required for verification through `start + duration + ttl`. It remains verifiable at that exact time.

Deleting a certificate as soon as its issuance period ends makes it impossible to verify DATs that have already been issued. Managers and CMS treat issuability and verifiability separately.

## Certificate IDs and key rotation

The `cid` is the public contract identifying a key and its time ranges. Never overwrite an existing `cid` with different keys. To rotate keys, create a new certificate with a new `cid`. Services synchronize the new certificate in advance and remove the old one only after every DAT it issued has expired.

## Signature algorithms

| Name | Purpose | Verify-only certificate |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | Not supported |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | Not supported |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | Not supported |
| `ECDSA-P256` | ECDSA P-256 | Supported |
| `ECDSA-P384` | ECDSA P-384 | Supported |
| `ECDSA-P521` | ECDSA P-521 | Supported |

HMAC signs and verifies with the same key, so giving that key to a verifying server also grants issuance authority. Use ECDSA and verify-only certificates in environments where issuance authority must be separated.

## Encryption algorithms

| Name | Key |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Algorithm names are part of the wire contract. Do not replace them with JWT aliases.

## Full and verify-only certificates

A full ECDSA certificate includes the private key required for signing. A verify-only certificate retains only the ECDSA public key, but keeps the AES key required to decrypt `secure`. A verify-only service can therefore verify and decrypt DATs, but cannot issue new ones.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
