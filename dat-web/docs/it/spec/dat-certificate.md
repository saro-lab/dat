# Certificati

Un certificato DAT rappresenta in un’unica stringa gli intervalli temporali, gli algoritmi e le chiavi necessari per emettere e verificare i token.

<WireFormat
  hint="Anche il certificato usa campi ASCII delimitati da punti in un ordine fisso."
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID immutabile del certificato'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'Inizio dell’emissione'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'Durata dell’emissione'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'Durata di validità del DAT'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'Algoritmo di firma'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Algoritmo crittografico'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Chiave di firma o verifica'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Chiave di cifratura'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## Intervalli temporali

<CertTimeline />

- Il certificato può emettere DAT da `start` a `start + duration`, estremi inclusi.
- Un DAT emesso resta valido per `ttl` a partire dall’istante di emissione.
- Il certificato è necessario per la verifica fino a `start + duration + ttl` ed è ancora verificabile esattamente in quell’istante.

Eliminare un certificato appena termina il periodo di emissione renderebbe impossibile verificare i DAT già emessi. Il gestore e il CMS distinguono quindi tra idoneità all’emissione e idoneità alla verifica.

## ID del certificato e rotazione delle chiavi

`cid` è il contratto pubblico che identifica chiavi e intervalli temporali. Non si sostituiscono le chiavi associate a un `cid` esistente. Per ruotare le chiavi si crea un nuovo certificato con un nuovo `cid`. I servizi sincronizzano in anticipo il nuovo certificato e rimuovono quello precedente solo dopo la scadenza di tutti i DAT emessi con esso.

## Algoritmi di firma

| Nome | Uso | Certificato di sola verifica |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | Non supportato |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | Non supportato |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | Non supportato |
| `ECDSA-P256` | ECDSA P-256 | Supportato |
| `ECDSA-P384` | ECDSA P-384 | Supportato |
| `ECDSA-P521` | ECDSA P-521 | Supportato |

HMAC usa la stessa chiave per firmare e verificare, quindi fornire la chiave a un servizio di verifica gli consente anche di emettere token. Se l’autorità di emissione deve restare separata, usare ECDSA e certificati di sola verifica.

## Algoritmi crittografici

| Nome | Chiave |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

I nomi degli algoritmi fanno parte del contratto wire e non devono essere sostituiti con alias usati da JWT.

## Certificati completi e di sola verifica

Un certificato ECDSA completo contiene la chiave privata necessaria per firmare. Un certificato di sola verifica conserva solo la chiave pubblica ECDSA, ma mantiene la chiave AES necessaria a decifrare `secure`. Un servizio di sola verifica può quindi controllare e decifrare un DAT, ma non può emetterne uno nuovo.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
