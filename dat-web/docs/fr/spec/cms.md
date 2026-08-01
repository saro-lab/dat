# Synchronisation CMS et exploitation des certificats

## 1. Présentation

Le **DAT CMS (Certificate Management Service)** est le serveur qui crée et distribue les certificats partagés par l'ensemble du cluster.

Chaque application récupère périodiquement la liste des certificats via le client CMS (`DatCmsManager`), et c'est cette synchronisation qui **automatise la rotation des clés**. Sans que l'exploitant ait à renouveler les clés manuellement, les certificats sont recréés selon un cycle défini et les anciens expirent d'eux-mêmes.

<ArchFlow
    :user="{label: 'Utilisateur', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Certificats créés par période de validité', 'Certificats expirés nettoyés']}"
    :service="{servers: [
        {label: 'Serveur de connexion', kind: 'issuer', icon: 'login',
         request: 'Demande de connexion', response: 'Émet un DAT avec le certificat', sync: 'Sync des certificats d’émission'},
        {label: 'Serveurs de contenu', kind: 'verifier', icon: 'apps',
         request: 'Requête de contenu avec DAT', response: 'Vérifie le DAT puis répond', sync: 'Sync des certificats de vérification'},
    ]}"
/>

Seul le serveur de connexion reçoit des certificats capables d’émettre ; les serveurs de contenu ne reçoivent que des certificats de vérification. **Un serveur de contenu n’a besoin de connaître que le CMS : il n’a pas à connaître le serveur de connexion.**

---

## 2. Protocole de synchronisation

### 2.1. Requête et réponse

<FlowDiagram
    title="Un cycle de synchronisation"
    :legend="{req: 'Requête', res: 'Réponse', sync: 'Synchronisation des certificats'}"
    :actors="[
        {id: 'app', label: 'Application', kind: 'issuer'},
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
    ]"
    :steps="[
        {from: 'app', label: 'version détenue = N', kind: 'note'},
        {from: 'app', to: 'cms', label: 'GET /v1/certs?version=N (Authorization: token)', kind: 'req'},
        {from: 'cms', label: 'version serveur = M, sélection des certificats plus récents que N', kind: 'note'},
        {from: 'cms', to: 'app', label: 'ligne 1 : M / lignes 2+ : liste des certificats', kind: 'res'},
        {from: 'app', label: 'si la liste est vide, conserver la version et terminer', kind: 'note'},
        {from: 'app', label: 'version = M uniquement si import(clear = true) réussit', kind: 'note'},
    ]"
/>

| Endpoint | Usage |
| --- | --- |
| `GET /v1/certs?version=N` | Certificats complets (clé privée de signature incluse) |
| `GET /v1/certs/verify-only?version=N` | Certificats de vérification seule |
| `GET /v1/certs.json`, `/v1/certs/verify-only.json` | Même contenu au format JSON |
| `POST /v1/cert/{sig-alg}/{crypto-alg}/{delay}/{duration}/{ttl}` | Création manuelle d'un certificat (token Master requis) |
| `GET /health` | Contrôle d'état |

Le corps de la réponse est un texte brut dont **la première ligne contient la version courante du serveur**, les lignes suivantes contenant un certificat par ligne.

```
1712345678
1a.1712345000.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
2b.1712348600.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
```

### 2.2. Curseur de version

Le client mémorise la dernière version traitée avec succès et l'envoie dans la requête suivante. Le serveur ne renvoie que les certificats plus récents que cette valeur.

* Si la version du client est **antérieure à celle du serveur** → seuls les certificats créés après celle-ci sont renvoyés.
* Si la version du client est **postérieure à celle du serveur** (remplacement de serveur, réinitialisation de base de données, etc.) → le curseur est ramené à `0` et **l'ensemble complet** est renvoyé.
* Le client n'avance sa version **que si l'importation a réussi.** Il s'agit d'éviter qu'une réponse en échec fasse avancer le curseur et fasse perdre définitivement des certificats.

::: tip Requête incrémentale, mais réponse en remplacement complet
`?version=N` signifie « donne-moi les modifications postérieures à N », mais le client **remplace sa liste par celle qu'il reçoit (clear = true) au lieu de la fusionner** avec l'existante. Le serveur détermine en effet toujours l'ensemble des certificats valides avant de les renvoyer ; grâce à ce fonctionnement, un certificat révoqué (revoke) côté CMS ne subsiste pas chez le client.
:::

### 2.3. Tokens d'authentification

Le CMS répartit les accès entre trois types de tokens.

| Token | Droits |
| --- | --- |
| `{{t('master_token')}}` | {{t('master_token_desc')}} |
| `{{t('full_cert_token')}}` | {{t('full_cert_token_desc')}} |
| `{{t('verify_cert_token')}}` | {{t('verify_cert_token_desc')}} |

Le principe est de ne donner que le token Verify Cert aux serveurs qui se contentent de vérifier. La clé de chiffrement étant toutefois incluse également dans la réponse verify-only, consultez à ce sujet les avertissements du document [{{t('menu_spec_cert')}}](./dat-certificate#_5-export-verify-only).

---

## 3. Délai d'émission des certificats (delay)

Si un nouveau certificat est utilisé pour émettre dès sa création, les autres nœuds qui ne se sont pas encore synchronisés ne peuvent pas vérifier les tokens signés avec ce certificat. Le **délai d'émission** sert à supprimer cette fenêtre.

<CertTimeline
    title="Le rôle de la phase de délai"
    caption="Pendant la phase de délai, tous les nœuds récupèrent le certificat ; l’émission ne commence qu’ensuite."
    :marks="['Création', 'Début d’émission', 'Fin d’émission', 'Expiration finale']"
    :phases="[
        {label: 'Délai d’émission', weight: 1.2, kind: 'delay', note: 'Attente de la synchronisation de tous les nœuds'},
        {label: 'Émission possible', weight: 3, kind: 'issue', note: 'Émission + vérification'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: 'Vérification seule'},
    ]"
/>

Supposons par exemple que le CMS crée le certificat A et que les serveurs 1 et 2 se synchronisent toutes les 60 secondes. Si le serveur 1 le reçoit en premier et émet un DAT avec A alors que le serveur 2 ne l'a pas encore reçu, le serveur 2 ne pourra pas vérifier ce DAT.

Avec un délai de 180 secondes, le certificat reste non émissible pendant les 180 secondes suivant sa création, ce qui laisse à tous les serveurs le temps d'achever leur synchronisation en toute sécurité. En tenant compte des erreurs réseau ponctuelles, il est recommandé de définir cette valeur à **au moins 3 à 4 fois l'intervalle de synchronisation de chaque serveur**.

---

## 4. Comportements intentionnels

Les comportements ci-dessous sont tous **voulus par conception** et ne constituent pas des défauts. Ils sont explicités ici car ils peuvent surprendre en exploitation.

### 4.1. La signature continue avec le certificat en cache après la fermeture de la fenêtre d'émission

L'application continue d'utiliser le certificat d'émission choisi au moment de la synchronisation et ne revérifie pas `issuable()` à chaque émission.

**Raison :** si la fenêtre d'émission se referme alors que la connexion avec le CMS est rompue, une approche à revérification **arrêterait instantanément toutes les connexions du service.** DAT a choisi ici de « continuer à émettre même si aucun nouveau certificat n'a pu être récupéré ».

**Contrepartie :** si une panne réseau se prolonge, des tokens peuvent continuer à être émis avec un certificat dont la fenêtre d'émission est déjà passée. Ces tokens restent toutefois normalement vérifiables par les autres nœuds jusqu'à l'expiration finale du certificat : le compromis retenu a été jugé préférable à un service hors ligne en cas d'incident.

### 4.2. Un certificat renouvelé avec le même CID est ignoré

Si un certificat arrive avec un CID déjà détenu, **le nouvel arrivant est ignoré**.

**Raison :** le CID est l'identifiant immuable du certificat. Si un même CID pointait vers des clés différentes, il deviendrait impossible de savoir avec quelle clé vérifier les tokens déjà émis et en circulation.

::: warning Un renouvellement de clé passe obligatoirement par un nouveau CID
Si vous distribuez une nouvelle clé en conservant le même CID, **le changement ne sera jamais pris en compte par les clients et aucune erreur ne sera levée.** Lors d'un renouvellement de clé, émettez un certificat avec un nouveau CID.
:::

### 4.3. En l'absence de nouveaux certificats, la liste existante est conservée

Si la réponse ne contient aucun certificat, le client **laisse sa liste en l'état.** Il ne la vide pas.

**Raison :** vider les certificats détenus au pire moment — serveur de certificats hors service ou réponse anormale — ferait **échouer instantanément toutes les vérifications de tokens**. En l'absence de nouvel élément, il est plus sûr de tenir avec ce que l'on a.

### 4.4. Le mode SINGLE_NODE crée un certificat à chaque démarrage

Lorsque le CMS est exécuté en mode nœud unique, **un certificat est créé à chaque démarrage**, qu'un certificat émissible existe ou non.

**Raison :** le mode nœud unique est une configuration destinée à faire fonctionner le CMS de façon autonome, sans infrastructure séparée. Un certificat immédiatement émissible doit être disponible dès le démarrage.

**Attention :** des redémarrages répétés font s'accumuler les certificats. Chaque certificat étant toutefois retiré de la liste une fois sa date d'expiration passée, leur nombre n'augmente pas indéfiniment.

### 4.5. En l'absence de certificat émissible, l'émission est immédiate, sans délai

Si, au moment de créer un certificat, aucun certificat émissible n'existe, le CMS **saute la phase de délai** et reporte la durée du délai sur la période d'émission.

**Raison :** respecter le délai signifierait que le cluster entier ne peut émettre aucun token pendant ce temps. Lors du tout premier démarrage ou d'une reprise après panne générale, l'émission doit être immédiatement possible. Un avertissement est alors consigné dans les journaux du serveur.

---

## 5. Révocation et expiration des certificats

* Un certificat reste dans la liste de distribution **jusqu'à son expiration finale (`start + duration + ttl`)**. Il ne disparaît pas dès la fermeture de sa fenêtre d'émission.
* Un DAT émis juste avant la fin de la fenêtre d'émission survit pendant toute la durée de son TTL : un serveur de vérification démarré pour la première fois après cet instant peut donc encore récupérer le certificat et vérifier ce token.
* Un certificat dont l'expiration finale est passée sort de la liste, puis est également supprimé du stockage lors du travail de nettoyage ultérieur.

---

## 6. Déploiement

Les options d'exécution du serveur CMS, les méthodes de déploiement Docker · Kubernetes · binaire ainsi que les variables d'environnement sont traitées dans un document séparé.

- [{{t('menu_svc_cms')}} — Guide de déploiement](../svc/docker-saro-lab-dat-cms)

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import ArchFlow from "../../.vitepress/ui/ArchFlow.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
const {t} = useTranslate();
</script>
