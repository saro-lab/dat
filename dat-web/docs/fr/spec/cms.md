# DAT CMS

DAT CMS est un service facultatif qui crée, stocke et distribue les certificats aux gestionnaires clients. Ce document décrit le contrat de synchronisation entre les clients et le serveur. Pour l’installation et l’exploitation, consultez le [guide du service DAT CMS](../svc/docker-saro-lab-dat-cms).

<FlowDiagram
  title="Synchronisation des certificats"
  :actors="[
    {id: 'client', label: 'Client', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'Demander la version et les certificats actuels', kind: 'req'},
    {from: 'cms', to: 'client', label: 'Renvoyer la version et les certificats', kind: 'res'},
    {from: 'client', label: 'Tout valider, puis appliquer atomiquement', kind: 'note'},
  ]"
/>

## Endpoints propres aux rôles

| Rôle | Chemin | Utilisé par |
| --- | --- | --- |
| Récupération des certificats complets | `GET /v1/certs?version=<n>` | Services qui émettent des DAT |
| Récupération des certificats verify-only | `GET /v1/certs/verify-only?version=<n>` | Services qui vérifient et déchiffrent uniquement |
| Enregistrement d’un certificat | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | Opérateurs ou tâches de génération de certificats |

La récupération des certificats complets et verify-only peut être protégée par des rôles de token distincts. Activez l’option `verifyOnly` du gestionnaire client afin qu’un service verify-only ne demande pas de certificats complets.

## Curseur de version

Le client envoie au serveur la dernière version qu’il a appliquée. Si l’état du serveur n’a pas changé, les certificats n’ont pas besoin d’être renvoyés. Lorsqu’un nouvel état est disponible, la réponse contient la version sur la première ligne et les certificats sur les lignes suivantes.

Si une réponse réussie ne contient qu’une version sans certificat, le client conserve ses certificats et son issuer actuels. Une version serveur inférieure à celle du client est traitée comme une erreur au lieu de provoquer un retour à l’état antérieur.

## Règles d’importation des certificats

- Si le même `cid` apparaît plusieurs fois dans une réponse, rejetez toute la réponse.
- Si une nouvelle réponse contient un `cid` déjà détenu, conservez le certificat existant.
- Analysez et validez chaque certificat avant d’appliquer l’état en une seule opération.
- Ne laissez pas un ensemble partiel de certificats importés avec succès.
- Sélectionnez un issuer approprié parmi les certificats utilisables pour l’émission à l’heure actuelle.

## Synchronisation initiale et manuelle

La première synchronisation lors de la création du gestionnaire client s’effectue généralement en best-effort. Si elle échoue, le gestionnaire est tout de même créé et conserve la dernière erreur concrète. Si l’application doit échouer au démarrage, appelez l’API de synchronisation immédiate de la bibliothèque afin que l’erreur parvienne à l’appelant.

Les environnements sans synchronisation automatique peuvent désactiver l’intervalle et synchroniser directement selon les besoins. Lorsque la synchronisation automatique est active, fermez ou arrêtez le gestionnaire à l’arrêt de l’application.

## Réseau et erreurs

Définissez des délais de connexion et de requête globale adaptés à l’environnement de production. Les politiques de redirection varient selon le runtime ; consultez la documentation de la bibliothèque. Les clients actuels classent les réponses CMS non 2xx comme des erreurs `DAT_CMS_*` d’après le statut HTTP et ne conservent pas le code d’erreur détaillé de la réponse JSON du serveur.

Lors d’une défaillance temporaire du stockage, le serveur peut continuer à servir le dernier snapshot de certificats réussi. S’il n’en existe encore aucun, il répond avec `DAT_STORE_UNAVAILABLE`.

## Documentation du service

Consultez le [guide du service DAT CMS](../svc/docker-saro-lab-dat-cms) pour le déploiement, les bases de données, les tokens d’accès et la configuration du runtime.

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
