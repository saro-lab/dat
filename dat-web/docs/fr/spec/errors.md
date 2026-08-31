# Codes d’erreur

Les implémentations DAT fournissent des codes d’erreur stables séparément des messages lisibles. Les programmes doivent prendre leurs décisions à partir du code et de la classification de retry, et non en comparant les chaînes de messages.

## Format des codes

```text
DAT_<AREA>_<CAUSE>
```

| Préfixe | Domaine |
| --- | --- |
| `DAT_TOKEN_` | Chaînes DAT et expiration |
| `DAT_CERT_` | Chaînes et état des certificats |
| `DAT_SIG_` | Signatures et vérification |
| `DAT_CRYPTO_` | Chiffrement et déchiffrement |
| `DAT_KEY_` | Formats des clés et pouvoirs |
| `DAT_MANAGER_` | Gestionnaires de certificats |
| `DAT_CONFIG_` | Arguments d’appel et configuration |
| `DAT_INTERNAL_` | Composants internes du runtime |
| `DAT_CMS_` | Synchronisation du client CMS |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | Serveur CMS |

`_UNKNOWN` n’est utilisé que lorsqu’une erreur ne peut être classée sous aucun autre code de son domaine. Une même cause porte le même nom dans tous les domaines.

## Classifications de retry

| Classification | Signification | Traitement |
| --- | --- | --- |
| Transient | Peut réussir lorsque la condition externe se rétablit | Réessayer un nombre limité de fois avec backoff |
| State | Peut réussir après synchronisation des certificats ou changement de l’heure | Actualiser l’état requis, puis réessayer |
| Permanent | Échoue à nouveau avec la même entrée | Corriger l’entrée, la configuration ou le code |

## Jetons et certificats

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
Le DAT présente un nombre de champs, une valeur numérique ou une représentation Base64Url invalide. Écartez l’entrée.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
La date d’expiration du DAT est égale ou antérieure à l’heure actuelle. Obtenez un nouveau DAT.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
La chaîne du certificat présente une structure ou une représentation de champ invalide.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
Aucun certificat ne correspond au `cid` du DAT. Vérifiez l’état de synchronisation des certificats.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
Le certificat requis n’est peut-être pas encore parvenu au service. Synchronisez immédiatement, puis réévaluez.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
L’heure de début du certificat n’est pas encore atteinte. Vérifiez l’horloge système et le calendrier de distribution du certificat.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
La période de vérification du certificat est terminée.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
Le même `cid` apparaît plusieurs fois dans une liste d’importation. Rejetez toute l’importation.
</ErrorCode>

## Signatures, chiffrement et clés

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
La signature ne correspond pas au corps. Le DAT a été modifié ou signé avec une autre clé.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
Le tag d’authentification AES-GCM ne correspond pas. Recherchez une altération du ciphertext ou une incompatibilité de certificat.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
La longueur, le format de la clé ou la combinaison d’algorithmes est invalide.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Une tentative d’émission de DAT a été effectuée avec un certificat verify-only. Un service d’émission nécessite un certificat complet.
</ErrorCode>

`DAT_SIG_MISMATCH` et `DAT_CRYPTO_TAG_MISMATCH` sont les erreurs classées comme true par l’API publique d’événements de sécurité. Une seule entrée invalide n’est pas une panne de service, mais des occurrences répétées doivent être considérées comme une observation de sécurité.

## Gestionnaires et configuration

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
Le gestionnaire ne possède aucun certificat. Importez des certificats ou terminez la synchronisation CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Le gestionnaire possède des certificats, mais aucun certificat complet n’est actuellement utilisable pour l’émission. Examinez la cause chain pour l’expiration, l’heure de début ou l’état verify-only.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Un argument d’appel ou une valeur de configuration se trouve hors de sa plage autorisée.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
Une capacité cryptographique ou réseau requise par la plateforme actuelle est indisponible.
</ErrorCode>

## Clients CMS

| Code | Signification | Traitement habituel |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | URI du CMS invalide | Corriger la configuration |
| `DAT_CMS_UNAUTHORIZED` | Échec de l’authentification | Corriger le token |
| `DAT_CMS_FORBIDDEN` | Le rôle du token n’a pas l’autorisation | Vérifier le rôle du token |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | Le chemin est absent ou différent | Vérifier l’URL et le chemin du CMS |
| `DAT_CMS_NETWORK` | Échec de connexion ou de transfert | Vérifier le réseau, puis appliquer un backoff |
| `DAT_CMS_TIMEOUT` | Délai dépassé | Ajuster les paramètres réseau et de timeout |
| `DAT_CMS_SERVER_ERROR` | Erreur du serveur CMS | Vérifier l’état du serveur, puis appliquer un backoff |
| `DAT_CMS_RESPONSE_INVALID` | Format de réponse réussie invalide | Vérifier le contrat serveur-client |
| `DAT_CMS_VERSION_RESET` | La version serveur a reculé | Vérifier les données CMS et l’état du déploiement |
| `DAT_CMS_IMPORT_FAILED` | Les certificats reçus n’ont pas pu être appliqués | Examiner la cause chain |
| `DAT_CMS_STOPPED` | Un gestionnaire arrêté a été utilisé | Créer un nouveau gestionnaire ou corriger l’ordre des appels |

Les bibliothèques dont la synchronisation initiale est en best-effort stockent l’erreur dans leur champ last-error. Si le démarrage doit échouer, utilisez l’API de synchronisation immédiate qui renvoie ou lève directement l’erreur.

## Serveur CMS

| Code | HTTP | Signification |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | Token absent ou invalide |
| `DAT_AUTH_FORBIDDEN` | 403 | Le rôle du token n’autorise pas la requête |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Nom d’algorithme non pris en charge |
| `DAT_REQ_NOT_FOUND` | 404·405 | Chemin ou méthode incorrecte |
| `DAT_REQ_TOO_LARGE` | 413 | Code réservé à un corps de requête trop volumineux |
| `DAT_STORE_UNAVAILABLE` | 503 | Stockage temporairement indisponible |
| `DAT_STORE_UNKNOWN` | 500 | Erreur de traitement du stockage non classée |

Les clients actuels n’exposent pas directement le code serveur des réponses JSON non 2xx ; ils convertissent le statut HTTP en code `DAT_CMS_*`. Les journaux du serveur et les codes d’erreur du client peuvent donc différer.

## Accès selon le langage

| Environnement | Code d’erreur | Classification de retry |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Pour les erreurs accompagnées d’une cause de niveau inférieur, examinez l’exception chain ou l’API d’accès à la cause du langage.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
