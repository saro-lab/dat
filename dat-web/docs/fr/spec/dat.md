# DAT (Distributed Access Token)

## 1. Présentation

À mesure que le nombre d'utilisateurs connectés simultanément augmente, le nombre de sessions croît lui aussi et une charge excessive pèse sur le serveur de sessions.

**DAT** est une spécification de token conçue pour résoudre ce problème de charge et pour mettre en œuvre une authentification efficace sans partage d'état entre les serveurs (Stateless).

DAT est une chaîne composée de **5 champs fixes** séparés par des points (`.`). Chaque champ peut être découpé à partir de la seule position des séparateurs, sans analyse JSON, et la date d'expiration ainsi que la zone chiffrée font partie intégrante de la spécification.

---

## 2. Format de trame (wire format)

<WireFormat
    title="Format de trame DAT"
    hint="Survolez chaque champ pour afficher son explication."
    :segments="[
        {name: 'expire', type: 'uint64 (décimal)', kind: 'meta', note: 'Date d’expiration du token. Entier décimal exprimé en secondes Unixtime.'},
        {name: 'cid', type: 'uint64 (hexadécimal)', kind: 'meta', note: 'ID du certificat à utiliser pour la vérification. Noté en hexadécimal minuscule.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Données exposées au client. N’importe qui peut les décoder.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Données chiffrées. Structure IV(96bit) + texte chiffré AES-GCM ; chaîne vide si absentes.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signature portant sur l’ensemble des quatre champs précédents. C’est ce champ qui empêche toute falsification.'},
    ]"
/>

```
expire . cid . plain . secure . signature
```

| Champ | Type | Encodage | Remarque |
| --- | --- | --- | --- |
| `{{t('dat_expire')}}` | uint64 | chaîne décimale | Unixtime (secondes) |
| `CID` | uint64 | chaîne hexadécimale | ID du certificat |
| `{{t('dat_plain')}}` | Binary | Base64Url (sans padding) | Données publiques |
| `{{t('dat_secure')}}` | Binary | Base64Url (sans padding) | Données chiffrées |
| `{{t('sig')}}` | Binary | Base64Url (sans padding) | Signature |

<Struct type="dat" />

### 2.1. Spécification détaillée par champ

`{{t('dat_expire')}}` : uint64 (Unix Time)
- Représente la date d'expiration du token sous la forme d'un entier 64 bits non signé exprimé en secondes (Seconds).
- **Seuls les chiffres décimaux purs sont acceptés.** La présence d'un signe, d'espaces ou de séparateurs constitue une erreur de format.

`CID` : Hex (uint64)
- Identifiant du certificat (Certificate ID) à utiliser pour la vérification du token.
- **Seuls les chiffres hexadécimaux purs sont acceptés** ; le préfixe `0x` n'est pas utilisé.

`{{t('dat_plain')}}` : Base64Url (Binary)
- Contient les données à exposer au client. Prend en charge non seulement les chaînes de caractères mais aussi les données binaires, que le client peut décoder et consulter.
- **Ces données ne sont pas chiffrées.** Aucune valeur sensible ne doit y être placée.

`{{t('dat_secure')}}` : Base64Url (Binary)
- Contient les données à ne pas divulguer au client. Elles sont chiffrées avec l'algorithme de chiffrement du certificat : un client qui ne possède pas le certificat ne peut pas en déchiffrer le contenu.
- La structure interne est `IV(96bit) + texte chiffré`, l'IV étant régénéré à chaque chiffrement.

`{{t('sig')}}` : Base64Url (Binary)
- Données de signature permettant de vérifier l'intégrité et l'authenticité du token. Elles sont générées en signant les champs précédents avec l'algorithme de signature du certificat.
- Aucun champ d'un token dont la vérification de signature a échoué ne doit être considéré comme fiable.

---

## 3. Règles canoniques (Canonical Rules)

Pour que des clients implémentés dans plusieurs langages **interprètent le même token de manière identique**, les règles ci-dessous ne doivent diverger dans aucune implémentation. L'implémentation de référence est celle en Rust (`dat-rust`) ; toutes les autres s'y conforment.

### 3.1. Analyse des champs numériques

`expire` et `cid` sont interprétés **de manière stricte**. Toutes les entrées ci-dessous sont rejetées comme erreurs de format.

| Exemple d'entrée | Résultat | Motif |
| --- | --- | --- |
| `100` | Accepté | décimal pur |
| `007` | Accepté | les zéros en tête sont autorisés |
| `+100` | Rejeté | signe interdit |
| `-1` | Rejeté | signe interdit |
| `" 100 "` | Rejeté | espaces interdits |
| `1_0` | Rejeté | séparateur interdit |
| `0x10` | Rejeté | préfixe interdit |
| `zzzz` | Rejeté | n'est pas un nombre |
| `""` | Rejeté | chaîne vide |
| `18446744073709551616` | Rejeté | dépasse la plage uint64 |

::: warning Pourquoi une telle rigueur est nécessaire
Un analyseur permissif transforme `-1` en la valeur maximale d'un uint64 et produit ainsi **un token qui n'expire pratiquement jamais**, ou convertit silencieusement en `0` une valeur non numérique. Si le degré de permissivité diffère d'une implémentation à l'autre, un même token passe d'un côté et est rejeté de l'autre : l'interopérabilité est rompue.
:::

### 3.2. Détermination de l'expiration

**Le token DAT et le certificat n'ont pas la même limite d'expiration.** Ne les confondez pas.

| Objet | Condition de validité | À l'instant exact de l'expiration (`expire == now`) |
| --- | --- | --- |
| **Token DAT** | `expire > now` | **rejeté comme expiré** |
| **Certificat** | `expire >= now` | **encore valide** |

Le token devient invalide dès l'instant où sa date d'expiration est atteinte, tandis que le certificat reste valide jusqu'à cet instant inclus. Il faut en effet que le certificat survive d'un cran au token pour pouvoir vérifier un token émis à la limite.

### 3.3. Charge utile secure vide

S'il n'y a aucune donnée à chiffrer, `secure` est une **chaîne vide**.

- `encrypt(entrée vide)` → sortie vide (ni IV, ni tag GCM ne sont ajoutés)
- `decrypt(entrée vide)` → sortie vide
- Une valeur non vide dont la longueur est inférieure ou égale à celle de l'IV (12 octets) constitue une **erreur de déchiffrement**.

```
1893456000.1a.SGVsbG8..T3RoZXItc2lnbmF0dXJl
                      ↑ token valide dont l'emplacement secure est vide
```

---

## 4. Émission et vérification

<FlowDiagram
    title="DAT : émission → transmission → vérification"
    :legend="{req: 'Requête', res: 'Réponse', sync: 'Synchronisation des certificats'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: 'Serveur émetteur', kind: 'issuer'},
        {id: 'client', label: 'Client', kind: 'client'},
        {id: 'verifier', label: 'Serveur de vérification', kind: 'node'},
    ]"
    :steps="[
        {from: 'cms', to: 'issuer', label: 'Distribution du certificat', kind: 'sync'},
        {from: 'cms', to: 'verifier', label: 'Distribution du certificat', kind: 'sync'},
        {from: 'client', to: 'issuer', label: 'Connexion', kind: 'req'},
        {from: 'issuer', label: 'issue(plain, secure)', kind: 'note'},
        {from: 'issuer', to: 'client', label: 'Émission du DAT', kind: 'res'},
        {from: 'client', to: 'verifier', label: 'Requête avec DAT joint', kind: 'req'},
        {from: 'verifier', label: 'Recherche du certificat par CID → vérification de signature → déchiffrement', kind: 'note'},
        {from: 'verifier', to: 'client', label: 'Réponse', kind: 'res'},
    ]"
/>

### 4.1. Procédure d'émission

1. Le gestionnaire choisit, parmi les certificats qu'il détient, un certificat **émissible (issuable)**.
2. Il calcule `expire = now + dat_ttl_seconds`.
3. Il encode `plain` en Base64Url et, pour `secure`, chiffre les données puis les encode en Base64Url.
4. Il signe la chaîne `expire.cid.plain.secure` et ajoute le résultat comme dernier champ.

### 4.2. Procédure de vérification

1. Découper en 5 champs sur le point (`.`). Un nombre de champs différent constitue une erreur de format.
2. Contrôler `expire`. Un token expiré est rejeté avant même la vérification de signature.
3. Rechercher le certificat à partir de `cid`. S'il est absent, la vérification est impossible.
4. Vérifier la signature sur la portion `expire.cid.plain.secure`.
5. Ce n'est qu'après une vérification réussie que `secure` est déchiffré.

::: danger Ne faites pas confiance aux valeurs obtenues avant la vérification de signature
Certaines implémentations fournissent une API permettant de lire les champs sans contrôler la signature (famille `parse without verify`). Ces valeurs sont **entièrement contrôlables par un attaquant** et ne doivent servir qu'à la journalisation et au débogage.
:::

---

## 5. Comparaison avec JWT

DAT et JWT (JSON Web Token) partagent une structure de token séparée par des points (`.`) ainsi qu'un mécanisme de vérification par signature, mais présentent les différences fondamentales suivantes dans leur conception interne.

### 5.1. Comparaison des différences structurelles

* **Structure JWT**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **Structure DAT**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |


### 5.2. Différences clés

* **Allègement basé sur le Binary :** JWT traite le Header et le Body sous forme de chaînes JSON, tandis que DAT **manipule directement les données binaires (Binary)**, optimisant ainsi la taille des données et améliorant l'efficacité de l'analyse.
* **Sécurité intégrée (champ `{{t('dat_secure')}}`) :** avec JWT, le Payload est exposé en clair par défaut et une spécification distincte telle que JWE doit être appliquée si un chiffrement est nécessaire. En revanche, DAT **prend en charge nativement le chiffrement via le champ `{{t('dat_secure')}}`**.
* **Contrainte d'expiration imposée :** dans JWT, le champ `exp` (Claims) est optionnel, alors que dans DAT le **champ `{{t('dat_expire')}}` est imposé par la structure du token**, ce qui rend la vérification de la durée de validité systématique.
* **Aucune négociation d'algorithme :** JWT transporte la valeur `alg` dans l'en-tête du token lui-même, ce qui crée une surface d'attaque par confusion d'algorithme. Dans DAT, l'algorithme est **déterminé par le certificat** et aucune information d'algorithme n'est présente dans le token.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
