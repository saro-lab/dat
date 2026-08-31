# DAT

DAT is an ASCII string separated by dots (`.`). Each field appears exactly once in a fixed order, and the signature verifies that the preceding fields are exactly as transmitted.

<WireFormat
  hint="Field order and separators are part of the specification."
  :segments="[
    {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Expiration Unix time'},
    {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'Certificate ID'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Public bytes'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Encrypted bytes'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signature over the first four fields'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## Fields

| Field | Representation | Meaning |
| --- | --- | --- |
| `expire` | Decimal unsigned integer | Unix time when the DAT expires |
| `cid` | Lowercase hexadecimal unsigned integer | Certificate ID used for verification |
| `plain` | Unpadded Base64Url | Unencrypted bytes |
| `secure` | Unpadded Base64Url | Bytes protected by the certificate's encryption algorithm |
| `signature` | Unpadded Base64Url | Signature over the original ASCII bytes of `expire.cid.plain.secure` |

Because `plain` is covered by the signature, it cannot be altered, but anyone can decode it. Put secrets, personal data, and values used directly for authorization decisions in `secure`. An empty `secure` field is valid.

## Canonical representation

- The entire DAT must be ASCII.
- Numbers are written without signs, spaces, prefixes, or unnecessary leading zeroes. Only the value zero is written as `0`.
- Base64Url uses the URL-safe alphabet and does not allow `=` padding or whitespace.
- Non-canonical Base64Url strings that represent the same bytes in multiple ways are rejected.
- A string with a different field count or order is not a DAT.

These rules prevent different implementations from accepting different strings as the same DAT.

## Issuance

1. Select a certificate that is currently issuable.
2. Add the certificate's TTL to the current time to create `expire`.
3. Encode `plain` with Base64Url.
4. Encrypt `secure` with the certificate's encryption algorithm.
5. Join the preceding fields with dots and sign their ASCII bytes.

Issuance is allowed only within the certificate's issuance window: `start <= now <= start + duration`.

## Verification

1. Parse the DAT according to the canonical rules.
2. Check that `expire > now`. A DAT with `expire == now` is expired.
3. Find the certificate matching `cid` and confirm that it remains valid for verification.
4. Verify the signature over the original `expire.cid.plain.secure` bytes.
5. Authenticate and decrypt `secure`, then return it together with `plain`.

A parsing API that does not verify the signature is only for observation or diagnostics. Never use its output for authentication or authorization.

## Responsibilities outside the specification

DAT does not define the user store, login method, authorization model, token transport header, or revocation list. The application decides which requests may use a verified payload.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
