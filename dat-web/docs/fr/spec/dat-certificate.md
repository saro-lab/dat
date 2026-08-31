# Certificats

Un certificat DAT exprime dans une chaîne unique les plages temporelles, les algorithmes et les clés nécessaires à l’émission et à la vérification des jetons.

<WireFormat
  hint="Un certificat se compose lui aussi de champs ASCII séparés par des points dans un ordre fixe."
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID immuable du certificat'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'Heure de début d’émission'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'Période d’émission'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'Durée de vie du DAT'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'Algorithme de signature'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Algorithme de chiffrement'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Clé de signature ou de vérification'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Clé de chiffrement'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## Plages temporelles

<CertTimeline />

- Un certificat peut émettre des DAT de `start` à `start + duration`, bornes incluses.
- Un DAT émis est valide pendant `ttl` à compter de son émission.
- Le certificat est requis pour la vérification jusqu’à `start + duration + ttl`. Il reste vérifiable à cet instant précis.

Supprimer un certificat dès la fin de sa période d’émission empêche de vérifier les DAT déjà émis. Les gestionnaires et le CMS traitent séparément la capacité d’émission et la capacité de vérification.

## ID de certificat et rotation des clés

Le `cid` est le contrat public qui identifie une clé et ses plages temporelles. Ne remplacez jamais les clés d’un `cid` existant. Pour effectuer une rotation, créez un nouveau certificat avec un nouveau `cid`. Les services synchronisent le nouveau certificat à l’avance et ne retirent l’ancien qu’après l’expiration de tous les DAT qu’il a émis.

## Algorithmes de signature

| Nom | Rôle | Certificat verify-only |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | Non pris en charge |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | Non pris en charge |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | Non pris en charge |
| `ECDSA-P256` | ECDSA P-256 | Pris en charge |
| `ECDSA-P384` | ECDSA P-384 | Pris en charge |
| `ECDSA-P521` | ECDSA P-521 | Pris en charge |

HMAC signe et vérifie avec la même clé. Fournir cette clé à un serveur de vérification lui confère donc également le pouvoir d’émission. Utilisez ECDSA et des certificats verify-only dans les environnements où ce pouvoir doit être séparé.

## Algorithmes de chiffrement

| Nom | Clé |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Les noms d’algorithmes font partie du wire contract. Ne les remplacez pas par des alias JWT.

## Certificats complets et verify-only

Un certificat ECDSA complet contient la clé privée requise pour signer. Un certificat verify-only ne conserve que la clé publique ECDSA, mais garde la clé AES nécessaire au déchiffrement de `secure`. Un service verify-only peut donc vérifier et déchiffrer les DAT, mais pas en émettre de nouveaux.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
