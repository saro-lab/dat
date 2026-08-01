# Certificat DAT

## 1. Présentation

Le **certificat DAT** est la spécification qui contrôle les droits d'émission des DAT et qui gère les algorithmes de signature et de chiffrement du token ainsi que les informations de clé (Key).

Chaque certificat possède un identifiant unique (`CID`) et assure une gestion sécurisée du cycle de vie des tokens en imposant la période d'émission autorisée des DAT ainsi que la durée de validité (TTL) des tokens générés.

Dans DAT, **la rotation des clés n'est pas optionnelle.** La période d'émission autorisée étant inscrite dans le certificat au niveau de la spécification, une fois cette période écoulée il devient impossible de créer de nouveaux tokens avec ce certificat.

---

## 2. Structure du certificat

<WireFormat
    title="Format de trame du certificat"
    hint="Survolez chaque champ pour afficher son explication."
    :segments="[
        {name: 'cid', type: 'uint64 (hexadécimal)', kind: 'meta', note: 'ID unique du certificat. Confronté au champ cid du DAT.'},
        {name: 'start', type: 'uint64 (décimal)', kind: 'meta', note: 'Heure de début d’émission (Unixtime, secondes).'},
        {name: 'duration', type: 'uint64 (décimal)', kind: 'meta', note: 'Durée d’émission autorisée (secondes). Il s’agit d’une durée, non d’une date absolue.'},
        {name: 'ttl', type: 'uint64 (décimal)', kind: 'meta', note: 'Durée de validité (secondes) des DAT émis avec ce certificat.'},
        {name: 'sig-alg', type: 'String', kind: 'plain', note: 'Nom de l’algorithme de signature.'},
        {name: 'crypto-alg', type: 'String', kind: 'plain', note: 'Nom de l’algorithme de chiffrement.'},
        {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Clé de signature. Lors d’un export verify-only, seule la clé publique sort pour ECDSA.'},
        {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Clé de chiffrement. Étant symétrique, elle sort toujours en entier, que l’export soit verify-only ou non.'},
    ]"
/>

```
cid . start . duration . ttl . sig-alg . crypto-alg . sig-key . crypto-key
```

<Struct type="cert" />

### 2.1. Spécification détaillée par champ

`CID` : Hex (uint64)

* Identifiant unique permettant d'identifier le certificat. Il est mis en correspondance avec le champ `CID` du DAT afin de déterminer quel certificat utiliser lors de la vérification.
* **Le CID est un identifiant immuable.** Lors d'un renouvellement de clé, on ne réutilise pas le même CID : un certificat est émis avec un nouveau CID.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* Représente l'**heure de début** à partir de laquelle ce certificat peut être utilisé pour émettre des DAT, exprimée en secondes (Seconds).

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* La **durée de validité d'émission** du certificat. Une fois cette durée (en secondes) écoulée depuis `{{t('dat_issue_start')}}`, il n'est plus possible d'émettre de nouveaux DAT avec ce certificat.
* **Il s'agit d'une durée (duration), et non d'une date absolue.** La date de fin se calcule par `start + duration`.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* La durée de validité (Time To Live) des DAT émis avec ce certificat. Lors de la création d'un DAT, la valeur `expire` est définie en ajoutant cette valeur à l'heure d'émission.

`{{t('sig_alg')}}` : String / Enum

* L'**algorithme de signature** à utiliser pour générer et vérifier le champ `signature` du DAT.

`{{t('crypto_alg')}}` : String / Enum

* L'**algorithme de chiffrement** à utiliser pour chiffrer et déchiffrer le champ `secure` du DAT.

`{{t('sig_key')}}` : Base64Url (Binary)

* Les données de clé utilisées pour la signature et la vérification. (Selon l'algorithme, il peut s'agir de la clé publique/privée d'une paire asymétrique ou d'une clé symétrique.)

`{{t('crypto_key')}}` : Base64Url (Binary)

* Les données de clé de chiffrement utilisées pour le chiffrement et le déchiffrement du champ `secure`.

### 2.2. Calcul des temps

```
end    = start + duration        fin de la fenêtre d'émission
expire = end + ttl               expiration finale du certificat
```

* Tous les calculs sont effectués en uint64 et **seul le dépassement de capacité (overflow) est rejeté** comme erreur.
* `duration = 0` et `ttl = 0` sont des **valeurs légitimes.** Elles permettent d'exprimer un certificat dont la fenêtre d'émission se referme immédiatement, ou un certificat produisant des tokens invalides dès leur émission.
* Tous les champs étant des entiers non signés, **les valeurs négatives n'existent pas au niveau du type.**

### 2.3. Signature du constructeur

Toutes les implémentations, quel que soit le langage, utilisent l'ordre d'arguments suivant.

```
(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,
 signature_key, crypto_key)
```

::: warning Le troisième argument est une durée, pas une date de fin
Si vous passez une date de fin absolue (end) en troisième argument, aucune erreur n'est levée mais **le certificat obtenu aura une fenêtre de validité totalement erronée**, la valeur étant reprise telle quelle dans `start + duration`.
:::

---

## 3. Cycle de vie du certificat

<CertTimeline
    title="Les quatre phases du certificat"
    caption="Un certificat n’expire définitivement qu’après avoir traversé le délai d’émission, la fenêtre d’émission et la période résiduelle correspondant au TTL des DAT."
    :marks="['Création', 'Début d’émission', 'Fin d’émission', 'Expiration finale']"
    :phases="[
        {label: 'Délai d’émission (delay)', weight: 1.2, kind: 'delay', note: 'Temps laissé à tous les nœuds pour récupérer le certificat'},
        {label: 'Émission possible (duration)', weight: 3, kind: 'issue', note: 'Émission et vérification des DAT possibles'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: 'Émission impossible, vérification seule'},
    ]"
/>

| Phase | Émission | Vérification | Détermination |
| --- | --- | --- | --- |
| Délai d'émission | ✕ | ○ | `issuable() == false` |
| Émission possible | ○ | ○ | `issuable() == true` |
| TTL DAT résiduel | ✕ | ○ | fenêtre d'émission close, mais avant expiration |
| Après expiration finale | ✕ | ✕ | `expired() == true` |

* La **possibilité d'émettre** est déterminée par `signable() && start <= now <= end`, **bornes incluses**.
* Même après la fermeture de la fenêtre d'émission, le certificat reste en vie pendant la durée `ttl` supplémentaire. Il faut en effet qu'un token émis juste avant la fermeture puisse aller au bout de sa durée de vie.
* La phase de **délai d'émission (delay)** sert à laisser à tous les nœuds du cluster le temps de récupérer le nouveau certificat. Pour plus de détails, consultez le document [{{t('menu_spec_cms')}}](./cms).

---

## 4. Algorithmes

### 4.1. Algorithmes de signature

Liste des algorithmes de signature protégeant les DAT contre la falsification et la modification. Les méthodes à clé symétrique et à clé asymétrique sont prises en charge.

| Nom | Méthode | Remarque |
| --- | --- | --- |
| `ECDSA-P256` | Asymétrique | Signature numérique à courbe elliptique (NIST secp256r1) |
| `ECDSA-P384` | Asymétrique | Signature numérique à courbe elliptique (NIST secp384r1) |
| `ECDSA-P521` | Asymétrique | Signature numérique à courbe elliptique (NIST secp521r1) |
| `HMAC-SHA256-MFS` | Symétrique | Keyed-Hashing basé sur une clé secrète de taille fixe de 256 bits |
| `HMAC-SHA384-MFS` | Symétrique | Keyed-Hashing basé sur une clé secrète de taille fixe de 384 bits |
| `HMAC-SHA512-MFS` | Symétrique | Keyed-Hashing basé sur une clé secrète de taille fixe de 512 bits |

> **MFS (Maximum Fixed Secret) :** méthode utilisant une clé secrète de taille fixe dont le nombre de bits est identique à la taille de sortie (Output) de l'algorithme de hachage.

### 4.2. Algorithmes de chiffrement

Liste des algorithmes de chiffrement authentifié (Authenticated Encryption) protégeant les données confidentielles internes au DAT (champ `secure`).

| Nom | Longueur de clé | Structure |
| --- | --- | --- |
| `IV-AES128-GCM` | 128 bits | IV(96bit) + résultat du chiffrement |
| `IV-AES256-GCM` | 256 bits | IV(96bit) + résultat du chiffrement |

> **Intégration de l'IV (Initialization Vector) :** un NONCE (IV) unique de 96 bits, généré à chaque chiffrement, est concaténé en préfixe (Prefix) devant le résultat du chiffrement. Lors du déchiffrement, les 96 premiers bits sont extraits en tant qu'IV pour effectuer le déchiffrement.

### 4.3. Validation de la longueur de clé

Lors de l'importation d'un certificat, **la correspondance entre le nombre de bits de l'algorithme déclaré et la longueur réelle de la clé est vérifiée**.

Par exemple, si un certificat déclarant `IV-AES256-GCM` contient une clé de 16 octets, l'importation elle-même est refusée. Sans ce contrôle, on croirait utiliser AES-256 alors que le système fonctionnerait en réalité en AES-128.

---

## 5. Export verify-only

Il n'est pas nécessaire de confier la clé privée de signature aux serveurs qui se contentent de vérifier. Le certificat DAT propose pour cela un **export verify-only**.

<FlowDiagram
    title="Chemins de distribution du certificat complet et du certificat verify-only"
    :legend="{req: 'Requête', res: 'Réponse', sync: 'Distribution des certificats'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: 'Serveur émetteur', kind: 'issuer'},
        {id: 'verifier', label: 'Serveur de vérification seule', kind: 'node'},
    ]"
    :steps="[
        {from: 'issuer', to: 'cms', label: 'GET /v1/certs', kind: 'req'},
        {from: 'cms', to: 'issuer', label: 'Certificat complet (clé privée de signature incluse)', kind: 'sync'},
        {from: 'verifier', to: 'cms', label: 'GET /v1/certs/verify-only', kind: 'req'},
        {from: 'cms', to: 'verifier', label: 'Certificat verify-only', kind: 'sync'},
    ]"
/>

| Algorithme de signature | `support_verify_only()` | Résultat de l'export verify-only |
| --- | --- | --- |
| Famille **ECDSA** | `true` | Seule la **clé publique** sort comme clé de signature (Base64 : 130 caractères → 87) |
| Famille **HMAC** | `false` | Une **erreur explicite** est levée |

HMAC étant à clé symétrique, la notion de « clé permettant uniquement de vérifier » n'existe pas. C'est pourquoi une tentative d'export verify-only n'est pas silencieusement ignorée : elle **est signalée immédiatement par une erreur.** Comme un export verify-only échoue dès qu'un certificat HMAC est présent dans le lot, il faut utiliser la famille ECDSA si vous exploitez des nœuds dédiés à la vérification.

::: danger La clé de chiffrement sort en entier, même en verify-only
La clé AES du champ `secure` étant une **clé symétrique**, elle **est toujours exportée en entier**, que l'export soit verify-only ou non. Il faut en effet la même clé que celle du chiffrement pour déchiffrer.

Autrement dit, un serveur ayant reçu un certificat verify-only :

* **ne peut pas falsifier de signature** — sans clé privée, il ne peut pas créer de nouveaux DAT ;
* **peut déchiffrer la charge utile `secure`** — aucune confidentialité ne lui est opposée.

Le mode verify-only est un mécanisme de partage des *droits d'émission*, et non de la *confidentialité*. Si une valeur doit rester cachée aux nœuds de vérification, elle ne doit pas être placée dans `secure`.
:::

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
