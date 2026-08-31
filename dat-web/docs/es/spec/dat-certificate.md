# Certificados

Un certificado DAT representa en una sola cadena el intervalo temporal, los algoritmos y las claves necesarios para emitir y verificar tokens.

<WireFormat
  hint="Un certificado también contiene campos ASCII separados por puntos en un orden fijo."
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID inmutable del certificado'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'Inicio de la emisión'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'Periodo apto para emitir'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'Duración del DAT'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'Algoritmo de firma'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Algoritmo de cifrado'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Clave de firma o verificación'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Clave de cifrado'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## Intervalos temporales

<CertTimeline />

- El certificado puede emitir DAT desde `start` hasta `start + duration`, incluidos ambos extremos.
- Un DAT emitido es válido durante `ttl` desde su momento de emisión.
- El certificado es necesario para verificar hasta `start + duration + ttl`. También puede verificar exactamente en ese momento.

Si el certificado se elimina en cuanto termina el periodo de emisión, los DAT ya emitidos dejan de poder verificarse. El gestor y CMS tratan por separado la aptitud para emitir y la aptitud para verificar.

## ID del certificado y rotación de claves

`cid` es el contrato público que identifica las claves y el intervalo temporal. Nunca se sobrescribe un `cid` existente con claves diferentes. Para rotar las claves, crea un certificado nuevo y usa un nuevo `cid`. Los servicios sincronizan el certificado nuevo con antelación y conservan el anterior hasta que hayan caducado todos los DAT emitidos con él.

## Algoritmos de firma

| Nombre | Uso | Certificado exclusivo para verificación |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | No compatible |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | No compatible |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | No compatible |
| `ECDSA-P256` | ECDSA P-256 | Compatible |
| `ECDSA-P384` | ECDSA P-384 | Compatible |
| `ECDSA-P521` | ECDSA P-521 | Compatible |

HMAC usa la misma clave para firmar y verificar, de modo que entregar la clave a un servidor verificador también le permite emitir. En entornos que deben separar el permiso de emisión, utiliza ECDSA y certificados exclusivos para verificación.

## Algoritmos de cifrado

| Nombre | Clave |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Los nombres de los algoritmos forman parte del contrato de wire. No se sustituyen por los alias usados en JWT.

## Certificados completos y exclusivos para verificación

Un certificado ECDSA completo incluye la clave privada necesaria para firmar. Un certificado exclusivo para verificación conserva únicamente la clave pública ECDSA, pero mantiene la clave AES necesaria para descifrar `secure`. Por ello, un servicio exclusivo para verificación puede comprobar y descifrar DAT, pero no puede emitir otros nuevos.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
