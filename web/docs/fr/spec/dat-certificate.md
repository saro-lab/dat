# Certificat DAT

## 1. Présentation (Introduction)

Le **certificat DAT** est une spécification destinée à contrôler les droits d'émission des DAT (Data Authentication Token) et à gérer les algorithmes de signature et de chiffrement ainsi que les informations de clé (Key) du token.

Chaque certificat possède un identifiant unique (`CID`) et assure une gestion sécurisée du cycle de vie des tokens en imposant la période d'émission autorisée ainsi que la durée de validité par défaut (TTL) des tokens générés.

---

## 2. Structure du certificat (Structure)

<Struct type="cert" />


### 2.1. Spécification détaillée par champ

`CID` : Hex (uint64)

* Identifiant unique du certificat permettant de l'identifier. Il est mappé avec le champ `CID` du DAT afin de déterminer quel certificat utiliser lors de la validation.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* Représente l'**heure de début** à partir de laquelle ce certificat peut être utilisé pour émettre des DAT, exprimée en secondes (Seconds).

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* La **durée de validité d'émission** du certificat. Une fois cette durée (en secondes) écoulée depuis `{{t('dat_issue_start')}}`, il n'est plus possible d'émettre de nouveaux DAT avec ce certificat.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* La durée de validité par défaut (Time To Live) des DAT émis avec ce certificat. Lors de la création d'un DAT, la valeur `expire` est définie comme la somme de l'heure d'émission (heure actuelle) et de `dat-ttl`.

`{{t('sig_alg')}}` : String / Enum

* L'**algorithme de signature** à utiliser pour générer et vérifier le champ `signature` du DAT.

`{{t('crypto_alg')}}` : String / Enum

* L'**algorithme de chiffrement** à utiliser pour chiffrer et déchiffrer le champ `secure` du DAT.

`{{t('sig_key')}}` : Base64Url (Binary)

* Les données de clé utilisées pour la signature et la vérification. (Selon l'algorithme, il peut s'agir d'une clé publique/privée asymétrique ou d'une clé symétrique.)

`{{t('crypto_key')}}` : Base64Url (Binary)

* Les données de clé de chiffrement utilisées pour le chiffrement et le déchiffrement du champ `secure`.

---

## 3. {{t('alg')}}

### {{t('sig_alg')}}

Liste des algorithmes de signature permettant de protéger les DAT contre la falsification et la modification.

Les méthodes à clé symétrique et à clé asymétrique sont prises en charge.

<br/>

**`ECDSA-P256`**
- Algorithme de signature numérique à courbe elliptique (NIST secp256r1)


**`ECDSA-P384`**
- Algorithme de signature numérique à courbe elliptique (NIST secp384r1)


**`ECDSA-P521`**
- Algorithme de signature numérique à courbe elliptique (NIST secp521r1)


**`HMAC-SHA256-MFS`**
- Keyed-Hashing basé sur une clé secrète de taille fixe (MFS) de 256 bits


**`HMAC-SHA384-MFS`**
- Keyed-Hashing basé sur une clé secrète de taille fixe (MFS) de 384 bits


**`HMAC-SHA512-MFS`**
- Keyed-Hashing basé sur une clé secrète de taille fixe (MFS) de 512 bits



> **MFS (Maximum Fixed Secret) :** Méthode utilisant une clé secrète de taille fixe dont le nombre de bits est identique à la taille de sortie (Output) de l'algorithme de hachage.

---

### {{t('crypto_alg')}}

Liste des algorithmes de chiffrement authentifié (Authenticated Encryption) permettant de protéger les données confidentielles (`secure` field) contenues dans le DAT.

Le résultat du chiffrement se présente sous la forme d'une combinaison de l'IV et des données chiffrées, afin de prévenir le déchiffrement non autorisé et les attaques par rejeu.

<br/>

**`IV-AES128-GCM`**
- IV(96bit) + 암호화_결과(Binary)
- Mode AES-GCM avec une clé de 128 bits


**`IV-AES256-GCM`**
- IV(96bit) + 암호화_결과(Binary)
- Mode AES-GCM avec une clé de 256 bits


> **Intégration de l'IV (Initialization Vector) :** Afin de prévenir les attaques par rejeu (Replay Attack), un NONCE (IV) unique de 96 bits généré à chaque chiffrement est concaténé en préfixe (Prefix) devant les données chiffrées dans le binaire résultant. Lors du déchiffrement, les 96 premiers bits sont extraits en tant qu'IV pour effectuer le déchiffrement.


<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
