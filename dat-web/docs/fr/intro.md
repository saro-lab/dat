# Qu’est-ce que DAT ?

DAT (Distributed Access Token) est une spécification de jeton d’accès utilisée par des services d’émission et de vérification qui partagent les mêmes certificats. La vérification ne nécessitant ni requête supplémentaire au service d’émission ni magasin de sessions central, les résultats d’authentification peuvent circuler entre des services plus faiblement couplés.

<WireFormat
  hint="Les champs séparés par des points forment un DAT unique."
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: 'Heure Unix d’expiration'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID du certificat'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: 'Données publiques'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: 'Données chiffrées'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: 'Signature du corps'},
  ]"
/>

## Composants

### DAT

Chaîne qu’un utilisateur ou un service envoie avec une requête. Elle contient une date d’expiration et un ID de certificat, et peut transporter des données publiques comme chiffrées.

### Certificat

Contient les algorithmes, les clés et les plages temporelles nécessaires à la création et à la vérification des DAT. L’ID du certificat, `cid`, est immuable ; utilisez un nouveau `cid` lors de la rotation des clés.

### Gestionnaire

Le gestionnaire de la bibliothèque cliente stocke les certificats, crée les DAT avec un certificat actuellement utilisable pour l’émission et vérifie chaque DAT avec le certificat correspondant à son `cid`.

### DAT CMS

Serveur facultatif qui crée, stocke et distribue les certificats aux services. Il peut fournir des certificats complets aux services d’émission et des certificats verify-only aux services qui se limitent à vérifier les jetons.

## Émission et vérification

<ArchFlow
  :user="{label: 'Utilisateur', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Gestion des certificats', 'Synchronisation fondée sur les versions']}"
  :service="{servers: [
    {label: 'Service d’émission', kind: 'issuer', icon: 'login', request: 'Identifiants', response: 'DAT', sync: 'Certificats complets'},
    {label: 'Service de vérification', kind: 'verifier', icon: 'apps', request: 'DAT', response: 'Fonction protégée', sync: 'Certificats verify-only'},
  ]}"
/>

Le service d’émission choisit les données `plain` et `secure`, puis crée un DAT. Le service de vérification contrôle la date d’expiration, la signature et le ciphertext avant de transmettre les deux zones de données à l’application. Comme `plain` est signé mais non chiffré, n’y placez aucun secret ni donnée personnelle.

## Pourquoi la vérification fonctionne encore après un changement de certificat

Dès qu’un nouveau certificat devient utilisable pour l’émission, les DAT suivants emploient son nouveau `cid`. Le certificat précédent reste disponible pour la vérification jusqu’à l’écoulement du TTL de tous les DAT qu’il a émis. La rotation des clés et la période de vérification des jetons existants sont ainsi gérées ensemble.

## Cas d’usage de DAT

- Environnements où l’authentification et les fonctions applicatives sont gérées par des services distincts
- Environnements où plusieurs runtimes émettent ou vérifient le même format de jeton
- Systèmes qui doivent transporter des données d’autorisation à courte durée de vie sans consultation d’une session centrale
- Systèmes qui doivent séparer les informations publiques de routage des données protégées dans un même jeton

DAT ne définit pas la politique d’autorisation elle-même. La validité d’un DAT et la décision de l’application d’autoriser une requête sont deux questions distinctes.

## Étapes suivantes

- [Spécification DAT](./spec/dat) : champs du jeton et règles de vérification
- [Certificats](./spec/dat-certificate) : clés et plages temporelles
- [Spécification DAT CMS](./spec/cms) : contrat de synchronisation
- [Bibliothèques](./libs/) : intégration à l’application

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
