# DAT (Data Authentication Token)

## 1. Présentation (Introduction)

À mesure que le nombre d'utilisateurs connectés simultanément augmente, le nombre de sessions croît également, ce qui génère une charge excessive sur le serveur de sessions.

**DAT** est une spécification de token conçue pour résoudre ce problème de charge sur le serveur de sessions et pour implémenter une authentification efficace sans état partagé entre les serveurs (Stateless).

---

## 2. Structure du token (Structure)

<Struct type="dat" />

### 2.1. Spécification détaillée par champ

`{{t('dat_expire')}}` : uint64 (Unix Time)
- Représente la date d'expiration du token sous la forme d'un entier 64 bits non signé exprimé en secondes (Seconds).

`CID` : Hex (uint64)
- L'ID de certificat (Certificate ID) utilisé pour la validation du token.

`{{t('dat_plain')}}` : Base64Url (Binary)
- Contient les données à exposer au client. Prend en charge non seulement les chaînes de caractères, mais aussi les données binaires, et peut être décodé et consulté côté client.

`{{t('dat_secure')}}` : Base64Url (Binary)
- Contient les données confidentielles non divulguées au client. Ces données sont chiffrées par un algorithme de chiffrement basé sur le certificat, ce qui empêche le client de les déchiffrer.

`{{t('sig')}}` : Base64Url (Binary)
- Données de signature permettant de vérifier l'intégrité et l'authenticité du token. Générées en signant les champs précédents avec l'algorithme de signature du certificat.

---

## 3. Comparaison avec JWT

DAT et JWT (JSON Web Token) partagent une structure de token séparée par des points (`.`) ainsi qu'un mécanisme de validation par `signature`, mais présentent les différences fondamentales suivantes dans leur conception interne.

### 3.1. Comparaison des différences structurelles

* **Structure JWT**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **Structure DAT**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |



### 3.2. Différences clés

* **Allègement basé sur le Binary :** JWT traite le Header et le Body sous forme de chaînes JSON, tandis que DAT **manipule directement les données binaires (Binary)**, optimisant ainsi la taille des données et améliorant l'efficacité du parsing.
* **Sécurité intégrée (champ `{{t('dat_secure')}} (secure)`) :** Avec JWT, le Payload est exposé en clair par défaut, et une spécification distincte telle que JWE doit être appliquée si un chiffrement est nécessaire. En revanche, DAT **prend en charge nativement le chiffrement via le champ `{{t('dat_secure')}}`**.
* **Expiration obligatoire :** Dans JWT, le champ `exp` (Claims) est optionnel, mais dans DAT, le **champ `{{t('dat_expire')}} (expire)` est obligatoire dans la structure du token**, ce qui rend la vérification de la durée de validité systématique.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
