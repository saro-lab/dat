# DAT CMS

DAT CMS is an optional service that creates, stores, and distributes certificates to client managers. This document describes the synchronization contract between clients and the server. For installation and operations, see the [DAT CMS service guide](../svc/docker-saro-lab-dat-cms).

<FlowDiagram
  title="Certificate synchronization"
  :actors="[
    {id: 'client', label: 'Client', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'Request current version and certificates', kind: 'req'},
    {from: 'cms', to: 'client', label: 'Return version and certificates', kind: 'res'},
    {from: 'client', label: 'Validate everything, then apply atomically', kind: 'note'},
  ]"
/>

## Role-specific endpoints

| Role | Path | Used by |
| --- | --- | --- |
| Full certificate retrieval | `GET /v1/certs?version=<n>` | Services that issue DATs |
| Verify-only certificate retrieval | `GET /v1/certs/verify-only?version=<n>` | Services that only verify and decrypt |
| Certificate registration | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | Operators or certificate-generation jobs |

Full and verify-only retrieval can be protected by separate token roles. Set the client manager's `verifyOnly` option so a verify-only service does not request full certificates.

## Version cursor

The client sends the last version it applied to the server. If the server state is unchanged, the certificates do not need to be sent again. When new state is available, the response contains the version on the first line and certificates on subsequent lines.

If a successful response contains only a version and no certificates, the client preserves its existing certificates and issuer. A response whose server version is lower than the client's version is treated as an error rather than rolling state back.

## Certificate import rules

- If the same `cid` appears more than once in a response, reject the entire response.
- If a new response contains a `cid` that is already held, keep the existing certificate.
- Parse and validate every certificate before applying the state in one operation.
- Do not leave a partial set of successfully imported certificates.
- Select an appropriate issuer from the certificates that are issuable at the current time.

## Initial and manual synchronization

The first synchronization during client manager construction is generally best-effort. If it fails, the manager is still created and retains the concrete last error. If the application must fail at startup, call the library's immediate synchronization API so the error reaches the caller.

Environments that do not use automatic synchronization can disable the interval and synchronize directly when needed. When automatic synchronization is enabled, close or stop the manager during application shutdown.

## Network and errors

Set connection and overall request timeouts for the production environment. Redirect policies differ by runtime, so consult the library documentation. Current clients classify non-2xx CMS responses as `DAT_CMS_*` errors based on the HTTP status and do not preserve the detailed error code from the server's JSON response.

During a temporary storage failure, the server may continue serving the last successful certificate snapshot. If no successful snapshot exists yet, it responds with `DAT_STORE_UNAVAILABLE`.

## Service documentation

Continue to the [DAT CMS service guide](../svc/docker-saro-lab-dat-cms) for deployment, databases, access tokens, and runtime configuration.

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
