# What is DAT?

DAT (Distributed Access Token) is an access-token specification used by issuing and verifying services that share the same certificates. Because verification does not require another request to the issuing service or a central session store, authentication results can be passed between less tightly coupled services.

<WireFormat
  hint="The dot-separated fields form a single DAT."
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: 'Expiration Unix time'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'Certificate ID'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: 'Public data'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: 'Encrypted data'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: 'Body signature'},
  ]"
/>

## Components

### DAT

A string that a user or service sends with a request. It includes an expiration time and certificate ID, and can carry both public and encrypted data.

### Certificate

Contains the algorithms, keys, and time ranges required to create and verify DATs. The certificate ID, `cid`, is immutable; use a new `cid` when rotating keys.

### Manager

The client library's manager stores certificates, creates DATs with a certificate that is currently issuable, and verifies each DAT with the certificate matching its `cid`.

### DAT CMS

An optional server that creates, stores, and distributes certificates to services. It can provide full certificates to issuing services and verify-only certificates to services that only verify tokens.

## Issuance and verification

<ArchFlow
  :user="{label: 'User', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Certificate management', 'Version-based synchronization']}"
  :service="{servers: [
    {label: 'Issuing service', kind: 'issuer', icon: 'login', request: 'Credentials', response: 'DAT', sync: 'Full certificates'},
    {label: 'Verifying service', kind: 'verifier', icon: 'apps', request: 'DAT', response: 'Protected feature', sync: 'Verify-only certificates'},
  ]}"
/>

The issuing service chooses the `plain` and `secure` data and creates a DAT. The verifying service checks the expiration time, signature, and ciphertext before passing both data regions to the application. Because `plain` is signed but not encrypted, do not put secrets or personal data in it.

## Why verification still works after certificates change

Once a new certificate becomes issuable, subsequent DATs use its new `cid`. The previous certificate remains available for verification until the TTL of every DAT it issued has elapsed. This allows key rotation and the verification period of existing tokens to be managed together.

## Where DAT fits

- Environments where authentication and application features are handled by different services
- Environments where multiple runtimes issue or verify the same token format
- Systems that need to carry short-lived authorization data without a central session lookup
- Systems that need to separate public routing information from protected data within one token

DAT does not define the authorization policy itself. A valid DAT and an application's decision to allow a request are separate matters.

## Next steps

- [DAT specification](./spec/dat): token fields and verification rules
- [Certificates](./spec/dat-certificate): keys and time ranges
- [DAT CMS specification](./spec/cms): synchronization contract
- [Libraries](./libs/): application integration

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
