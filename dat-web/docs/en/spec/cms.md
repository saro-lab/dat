# CMS Synchronization and Certificate Operations

## 1. Overview

The **DAT CMS (Certificate Management Service)** is the server that creates and distributes the certificates shared by the entire cluster.

Each application fetches the certificate list periodically through the CMS client (`DatCmsManager`), and this synchronization is what **automates key rolling**. Without an operator rotating keys by hand, certificates are created anew on a fixed schedule and old ones expire on their own.

<ArchFlow
    :user="{label: 'User', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Creates certificates per validity window', 'Clears out expired ones']}"
    :service="{servers: [
        {label: 'Login server', kind: 'issuer', icon: 'login',
         request: 'Login request', response: 'Issues a DAT with the certificate', sync: 'DAT-issuing certificate sync'},
        {label: 'Content servers', kind: 'verifier', icon: 'apps',
         request: 'Content request with DAT', response: 'Verifies the DAT, then serves', sync: 'Verify-only certificate sync'},
    ]}"
/>

Only the login server gets certificates it can issue with, while the content servers get verify-only certificates. **A content server only needs to know the CMS; it does not need to know the login server.**

---

## 2. Synchronization Protocol

### 2.1. Request and Response

<FlowDiagram
    title="One synchronization cycle"
    :legend="{req: 'Request', res: 'Response', sync: 'Certificate sync'}"
    :actors="[
        {id: 'app', label: 'Application', kind: 'issuer'},
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
    ]"
    :steps="[
        {from: 'app', label: 'Holds version = N', kind: 'note'},
        {from: 'app', to: 'cms', label: 'GET /v1/certs?version=N (Authorization: token)', kind: 'req'},
        {from: 'cms', label: 'Server version = M; selects certificates newer than N', kind: 'note'},
        {from: 'cms', to: 'app', label: 'Line 1: M / line 2 onward: certificate list', kind: 'res'},
        {from: 'app', label: 'If the list is empty, keep version and stop', kind: 'note'},
        {from: 'app', label: 'Set version = M only if import(clear = true) succeeds', kind: 'note'},
    ]"
/>

| Endpoint | Purpose |
| --- | --- |
| `GET /v1/certs?version=N` | Full certificates (including the signing private key) |
| `GET /v1/certs/verify-only?version=N` | Verification-only certificates |
| `GET /v1/certs.json`, `/v1/certs/verify-only.json` | The same content in JSON form |
| `POST /v1/cert/{sig-alg}/{crypto-alg}/{delay}/{duration}/{ttl}` | Manual certificate creation (requires the Master token) |
| `GET /health` | Health check |

The response body is plain text whose **first line is the server's current version**, followed by one certificate per line from the next line onward.

```
1712345678
1a.1712345000.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
2b.1712348600.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
```

### 2.2. Version Cursor

The client remembers the last version it successfully applied and sends it with the next request. The server returns only the certificates newer than that value.

* If the client version is **older than the server's** → only the certificates created after it are returned.
* If the client version is **newer than the server's** (server replacement, database reset, and so on) → the cursor is reset to `0` and the **entire set** is returned.
* The client advances its version **only when the import succeeds.** This prevents the cursor from moving past a failed response and permanently missing certificates.

::: tip The request is incremental, but the response replaces everything
`?version=N` means "give me the changes since N", yet the client **replaces (clear = true) rather than merges** the received list with its existing one. The server always determines and sends down the complete set of valid certificates, and thanks to this approach a certificate revoked at the CMS never lingers on the client.
:::

### 2.3. Access Tokens

The CMS partitions access with three kinds of tokens.

| Token | Permission |
| --- | --- |
| `{{t('master_token')}}` | {{t('master_token_desc')}} |
| `{{t('full_cert_token')}}` | {{t('full_cert_token_desc')}} |
| `{{t('verify_cert_token')}}` | {{t('verify_cert_token_desc')}} |

As a rule, a server that only verifies should be given the Verify Cert token alone. Note, however, that the encryption key is included in the verify-only response too, so review what that means together with the warning in the [{{t('menu_spec_cert')}}](./dat-certificate#_5-verify-only-export) document.

---

## 3. Certificate Issuance Delay (delay)

If a new certificate is used for issuance the instant it is created, other nodes that have not synchronized yet cannot verify tokens signed with it. The **issuance delay** is the value that eliminates that gap.

<CertTimeline
    title="What the delay phase does"
    caption="During the delay phase every node fetches the certificate, and only afterwards does issuance begin."
    :marks="['Created', 'Issuance starts', 'Issuance ends', 'Final expiration']"
    :phases="[
        {label: 'Issuance delay', weight: 1.2, kind: 'delay', note: 'Waiting for all nodes to sync'},
        {label: 'Issuable', weight: 3, kind: 'issue', note: 'Issuance + verification'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: 'Verification only'},
    ]"
/>

For example, assume the CMS creates certificate A and servers 1 and 2 synchronize on a 60-second cycle. If server 1 receives it first and issues a DAT with A while server 2 has not received it yet, server 2 cannot verify that DAT.

If the delay is set to 180 seconds, the certificate stays non-issuable for 180 seconds after creation, and in the meantime every server safely completes its synchronization. Allowing for transient network failures, it is recommended to set this value **at least 3 to 4 times larger than each server's synchronization interval**.

---

## 4. Intended Behavior

All the behaviors below are **intended by design** and are not defects. They are documented explicitly because they may look unexpected in operation.

### 4.1. Signing continues with the cached certificate even after the issuance window closes

An application keeps using the issuing certificate it selected at synchronization time, and does not re-check `issuable()` on every issuance.

**Reason:** If the issuance window closes while the connection to the CMS is down, a re-checking approach would **halt login for the entire service** at that moment. DAT chose "even if a new certificate could not be fetched, keep issuing for now."

**Trade-off:** If the network outage drags on, tokens may keep going out signed with a certificate whose issuance window has already passed. Even so, those tokens verify normally on other nodes until the certificate's final expiration, so this was judged a better trade-off than letting the service die during an outage.

### 4.2. A certificate re-sent under an existing CID is discarded

If a certificate arrives with the same CID as one already held, the **newly arrived one is ignored**.

**Reason:** The CID is the immutable identifier of a certificate. If the same CID were to point at different keys, there would be no way to tell which key should verify the tokens already issued and in circulation.

::: warning Always rotate keys with a new CID
If you keep the same CID and deploy only a changed key, **it will never be reflected on clients and no error will be raised either.** When rotating a key, issue a certificate with a new CID.
:::

### 4.3. If there are no new certificates, the existing list is kept

If the response contains no certificates at all, the client **leaves its held list untouched.** It does not clear the list.

**Reason:** Emptying the held certificates at the worst possible moment — when the certificate server is down or the response is malformed — would make **all token verification fail** instantly. When nothing new arrives, it is safer to keep going with what you already have.

### 4.4. SINGLE_NODE mode creates a certificate on every startup

When the CMS runs in single-node mode, it **creates one certificate at every startup**, regardless of whether an issuable certificate already exists.

**Reason:** Single-node mode is a configuration for running the CMS standalone without separate infrastructure. An issuable certificate has to be available immediately after startup.

**Caution:** Repeated restarts keep piling up certificates. That said, each certificate drops out of the list once its own expiration time has passed, so the count does not grow without bound.

### 4.5. If no issuable certificate exists, issuance starts immediately with no delay

If there is not a single issuable certificate at the moment a certificate is created, the CMS **skips the delay phase** and folds the delay time into the issuance window.

**Reason:** Honoring the delay would leave the entire cluster unable to issue a single token for that duration. On first startup or while recovering from a total outage, issuance has to be possible immediately. A warning is written to the server log in this case.

---

## 5. Certificate Withdrawal and Expiration

* A certificate stays in the distribution list **until its final expiration (`start + duration + ttl`)**. It does not disappear the moment its issuance window closes.
* A DAT that went out just before the issuance window ended lives on for its own TTL, so even a verifying server that boots for the first time after that point can fetch the certificate and verify that token.
* Once a certificate passes its final expiration it drops out of the list, and a subsequent cleanup job removes it from storage as well.

---

## 6. Deployment

The CMS server's run options, the Docker · Kubernetes · binary deployment methods, and the environment variables are covered in a separate document.

- [{{t('menu_svc_cms')}} Deployment Guide](../svc/docker-saro-lab-dat-cms)

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import ArchFlow from "../../.vitepress/ui/ArchFlow.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
const {t} = useTranslate();
</script>
