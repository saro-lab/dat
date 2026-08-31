# DAT

Un DAT est une chaîne ASCII séparée par des points (`.`). Chaque champ apparaît exactement une fois dans un ordre fixe, et la signature vérifie que les champs précédents correspondent exactement aux données transmises.

<WireFormat
  hint="L’ordre des champs et les séparateurs font partie de la spécification."
  :segments="[
    {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Heure Unix d’expiration'},
    {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'ID du certificat'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Bytes publics'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Bytes chiffrés'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signature des quatre premiers champs'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## Champs

| Champ | Représentation | Signification |
| --- | --- | --- |
| `expire` | Entier non signé décimal | Heure Unix à laquelle le DAT expire |
| `cid` | Entier non signé hexadécimal en minuscules | ID du certificat utilisé pour la vérification |
| `plain` | Base64Url sans padding | Bytes non chiffrés |
| `secure` | Base64Url sans padding | Bytes protégés par l’algorithme de chiffrement du certificat |
| `signature` | Base64Url sans padding | Signature des bytes ASCII originaux de `expire.cid.plain.secure` |

Comme `plain` est couvert par la signature, il ne peut pas être modifié, mais tout le monde peut le décoder. Placez les secrets, les données personnelles et les valeurs directement utilisées pour les décisions d’autorisation dans `secure`. Un champ `secure` vide est valide.

## Représentation canonique

- Le DAT entier doit être en ASCII.
- Les nombres sont écrits sans signe, espace, préfixe ni zéro initial superflu. Seule la valeur zéro s’écrit `0`.
- Base64Url utilise l’alphabet adapté aux URL et n’autorise ni padding `=` ni espace.
- Les chaînes Base64Url non canoniques représentant les mêmes bytes de plusieurs façons sont rejetées.
- Une chaîne dont le nombre ou l’ordre des champs diffère n’est pas un DAT.

Ces règles empêchent différentes implémentations d’accepter des chaînes différentes comme un même DAT.

## Émission

1. Sélectionnez un certificat actuellement utilisable pour l’émission.
2. Ajoutez le TTL du certificat à l’heure actuelle pour créer `expire`.
3. Encodez `plain` en Base64Url.
4. Chiffrez `secure` avec l’algorithme de chiffrement du certificat.
5. Joignez les champs précédents avec des points et signez leurs bytes ASCII.

L’émission n’est autorisée que dans la fenêtre d’émission du certificat : `start <= now <= start + duration`.

## Vérification

1. Analysez le DAT selon les règles canoniques.
2. Vérifiez que `expire > now`. Un DAT dont `expire == now` est expiré.
3. Trouvez le certificat correspondant à `cid` et confirmez qu’il reste valide pour la vérification.
4. Vérifiez la signature des bytes originaux de `expire.cid.plain.secure`.
5. Authentifiez et déchiffrez `secure`, puis renvoyez-le avec `plain`.

Une API d’analyse qui ne vérifie pas la signature sert uniquement à l’observation ou au diagnostic. N’utilisez jamais son résultat pour l’authentification ou l’autorisation.

## Responsabilités hors spécification

DAT ne définit ni le magasin d’utilisateurs, ni la méthode de connexion, ni le modèle d’autorisation, ni l’en-tête de transport du jeton, ni la liste de révocation. L’application décide quelles requêtes peuvent utiliser un payload vérifié.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
