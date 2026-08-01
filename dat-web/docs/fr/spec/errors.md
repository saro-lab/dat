# Codes d'erreur

Voici les codes d'erreur communs aux bibliothèques de service officiellement prises en charge par DAT.

Chaque code porte deux valeurs — **impact** et **nouvelle tentative** — et certains reçoivent en plus l'étiquette **suspect**.

## Impact — ce que le service encaisse

C'est le critère pour déclencher une alerte. On ne regarde qu'une chose : « le service est-il à l'arrêt en ce moment ? »

| Impact | Signification | Exemple |
| --- | --- | --- |
| <span class="lg lg-critical">Critique</span> | Le service ou une fonction précise **s'arrête.** Émission impossible, synchronisation définitivement en échec, initialisation en échec | Le serveur émetteur n'a pas un seul certificat utilisable |
| <span class="lg lg-partial">Partiel</span> | Certaines requêtes ou certains cycles échouent, mais le service continue de tourner. Il se rétablit généralement de lui-même | Un cycle CMS échoue. Tout continue avec les certificats déjà en place |
| <span class="lg lg-none">Aucun impact</span> | Une requête est rejetée, et c'est tout | Un token falsifié arrive. Il suffit de le filtrer |

**Aucun impact** n'est pas un cas d'alerte. Si toute l'équipe d'astreinte devait vérifier parce qu'une entrée erronée est arrivée une fois, l'alerte perdrait tout son sens.

## Suspect — enquêter si cela persiste

Les codes portant l'étiquette <span class="lg lg-suspect">Suspect</span> font **partie du fonctionnement normal lorsqu'ils sont isolés**. Un client peut envoyer une valeur erronée à tout moment, et le rôle de la bibliothèque est précisément de la filtrer.

Mais si ces erreurs surviennent **de façon persistante, ou en rafale depuis une source précise**, il s'agit de l'un de ces deux cas.

- **Anomalie de configuration** — un déploiement incorrect, des clients d'une ancienne version encore en service, ou des certificats désalignés.
- **Tentative d'intrusion** — une tentative de passer la vérification avec des tokens ou des clés falsifiés, ou un balayage à la recherche de valeurs valides.

C'est pourquoi il convient, pour ces codes, **de suivre le nombre d'occurrences comme métrique**. Il suffit d'alerter au franchissement d'un seuil.

## Nouvelle tentative

| Nouvelle tentative | Signification |
| --- | --- |
| <span class="lg lg-transient">Transitoire</span> | Se résout en réessayant après un backoff |
| <span class="lg">Permanent</span> | Ne pas réessayer. La configuration ou l'entrée doit être corrigée |
| <span class="lg">État</span> | Ce n'est pas une erreur mais un signal |

---

## Token

Problèmes portant sur la chaîne du token reçu elle-même.

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="Rejeter la requête">
Les parties séparées par des points ne sont pas exactement cinq, <code>expire</code> n'est pas un décimal pur, <code>cid</code> n'est pas un hexadécimal pur, <code>plain</code> ou <code>secure</code> ne sont pas en base64url, ou un champ numérique dépasse la plage entière représentable.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="Amener à réémettre le token">
<code>expire &lt;= now</code>. <strong>L'instant pile compte aussi comme expiré</strong> — si <code>expire == now</code>, le token est déjà expiré.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="Consulter les journaux">
Une erreur de token qui ne se range dans aucune des catégories ci-dessus.
</ErrorCode>

::: tip Ne jamais confondre expiration et erreur de format
Les réactions sont opposées — l'expiration est une fin de vie normale, il suffit de faire renouveler le token ; une erreur de format signifie que le token n'a jamais été émis par nous et doit être rejeté.

L'analyse **établit d'abord la structure**, puis examine les valeurs. Une chaîne comme `"1.2.3"`, à qui il manque des parties, n'est pas un token expiré mais n'est pas un token du tout : c'est donc `DAT_TOKEN_MALFORMED`.

Un signe dans le champ `expire`, comme `+100`, n'est pas non plus une expiration mais une erreur de format. Seuls les chiffres ASCII purs sont admis.
:::

---

## Certificat

Le format de la chaîne du certificat, et la question de savoir si ce certificat est utilisable maintenant.

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="Redéployer le certificat">
Les parties séparées par des points ne sont pas exactement huit, l'analyse de <code>cid</code>, <code>start</code>, <code>duration</code> ou <code>ttl</code> a échoué, un champ de clé n'est pas en base64url, ou <code>start + duration + ttl</code> dépasse u64.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="Renouveler le certificat">
<code>start + duration + ttl &lt; now</code>. Entièrement expiré : ni l'émission ni la vérification ne sont possibles.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="Attendre">
<code>now &lt; start</code>. La fenêtre d'émission n'est pas encore ouverte.
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="Déployer un nouveau certificat">
<code>now &gt; start + duration</code>, mais il reste du ttl. L'émission n'est plus possible, seule la vérification l'est.
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="Vérifier la configuration de déploiement">
Un certificat qui ne contient que la clé publique, sans clé privée de signature. La vérification fonctionne, l'émission non.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="Rejeter la requête">
Aucun certificat ne correspond au <code>cid</code> du token. Soit un token falsifié, soit une erreur de déploiement.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="Réessayer après la synchronisation">
Ce <code>cid</code> n'a pas encore été reçu du CMS. Survient brièvement juste après le déploiement d'un nouveau certificat.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="Vérifier la réponse du serveur">
Le même <code>cid</code> apparaît plus d'une fois dans la liste importée.
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="Consulter les journaux">
Une erreur de certificat qui ne se range dans aucune des catégories ci-dessus.
</ErrorCode>

`DAT_CERT_NOT_FOUND` et `DAT_CERT_NOT_SYNCED` présentent les mêmes symptômes, mais appellent des réactions différentes. Le premier concerne un `cid` que nous n'avons jamais émis : attendre n'y changera rien. Le second se résout dès que la synchronisation a lieu.

Un `DAT_CERT_NOT_FOUND` isolé se filtre sans plus ; si le nombre augmente brusquement, c'est que le déploiement est désaligné ou que des tokens falsifiés circulent.

---

## Signature

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="Bloquer la session, journal de sécurité">
La vérification de signature s'est terminée sur une <strong>divergence</strong>. La valeur HMAC ne correspond pas, ou ECDSA verify renvoie false.
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="Rejeter la requête">
La partie signature est vide, n'est pas en base64url, la longueur de <code>r‖s</code> ECDSA ne correspond pas à la courbe, ou la conversion DER a échoué.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="Vérifier la configuration du serveur émetteur">
Une signature a été tentée avec une clé de vérification seule. Aucune clé privée n'est présente à l'exécution.
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="Vérifier le type de clé et la bibliothèque">
L'opération de signature ou de vérification <strong>n'a pas pu s'exécuter du tout.</strong> Type de clé incorrect, handle libéré, ou erreur interne de la bibliothèque cryptographique.
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="Consulter les journaux">
Une erreur de signature qui ne se range dans aucune des catégories ci-dessus.
</ErrorCode>

::: warning Ne pas mélanger divergence et échec du backend
Les deux codes se situent sur des axes opposés.

- `DAT_SIG_MISMATCH` — une signature entrante qui ne correspond pas, donc **sans impact sur le service** ; en revanche, si cela persiste, c'est un cas **suspect**.
- `DAT_SIG_BACKEND` — l'opération de vérification elle-même n'a pas tourné : c'est **un problème de notre côté**, et ce n'est pas un cas suspect.

Signaler un type de clé incorrect ou un bug de bibliothèque comme une « divergence de signature » revient à mêler aux indicateurs d'attaque une situation où c'est en réalité notre code qui est cassé. À l'inverse, une véritable falsification classée en erreur de backend disparaît entièrement des métriques de suspicion.
:::

---

## Chiffrement

Problèmes de chiffrement et de déchiffrement de la charge utile secure.

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="Bloquer la session, journal de sécurité">
Le tag d'authentification AES-GCM ne correspond pas. Soit secure a été altéré, soit la clé du certificat est différente.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="Rejeter la requête">
Le chiffré n'est pas vide mais ne dépasse pas la taille de l'IV (12 octets), ou l'entrée dépasse la limite de l'implémentation (<code>INT_MAX</code>, etc.).
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="Vérifier la prise en charge par la plateforme">
L'opération de chiffrement ou de déchiffrement n'a pas pu s'exécuter. Plateforme sans prise en charge de GCM, ou échec d'initialisation du contexte.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="Consulter les journaux">
Une erreur de chiffrement/déchiffrement qui ne se range dans aucune des catégories ci-dessus.
</ErrorCode>

**Une charge utile secure vide n'est pas une erreur.** Une entrée vide donne une sortie vide, et aucun code n'est émis.

Sur le chemin qui saute la vérification de signature, le tag GCM est **le seul contrôle d'intégrité**. C'est pourquoi `DAT_CRYPTO_TAG_MISMATCH` n'est pas regroupé avec les autres échecs de déchiffrement sous un même code.

---

## Clé

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="Remplacer la clé">
La longueur de clé ne correspond pas à l'algorithme déclaré (HMAC 32/48/64, AES 16/32), le point n'est pas sur la courbe, <code>d ∉ [1,n-1]</code>, le format n'est pas non compressé (0x04), ou la clé privée et la clé publique ne forment pas une paire.
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="Changer d'algorithme">
Un export en vérification seule a été demandé pour un algorithme de la famille HMAC.
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="Consulter les journaux">
Une erreur de clé qui ne se range dans aucune des catégories ci-dessus.
</ErrorCode>

**Trois cas qui se ressemblent mais diffèrent :**

| Code | Signification |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **Limite structurelle de l'algorithme.** HMAC est symétrique et n'a pas de notion de clé publique |
| `DAT_SIG_KEY_MISSING` | **État à l'exécution.** Cette clé ne contient actuellement pas de clé privée |
| `DAT_CERT_VERIFY_ONLY` | **Forme de déploiement.** Ce certificat a été déployé en vérification seule |

---

## Gestionnaire

L'état de l'objet qui détient les certificats et sert à émettre et vérifier.

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="Vérifier la connexion au CMS">
Aucun certificat n'est détenu. Soit avant l'import, soit après l'échec de la première synchronisation CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="Décider selon la cause — voir le tableau ci-dessous">
Des certificats existent, mais aucun n'est utilisable pour émettre en ce moment. <strong>La cause est transmise avec l'erreur.</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="Corriger le code appelant">
Un gestionnaire ou un certificat déjà libéré a été utilisé.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="Consulter les journaux">
Une erreur de gestionnaire qui ne se range dans aucune des catégories ci-dessus.
</ErrorCode>

La cause (`cause`) de `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` est l'une des quatre suivantes. **Ce qu'il faut faire diffère complètement selon l'origine.**

| Cause | Signification | Nouvelle tentative | Réaction |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | Avant le début de la fenêtre d'émission | **Transitoire** | Se résout en attendant |
| `DAT_CERT_ISSUANCE_ENDED` | Fenêtre d'émission close, vérification seule possible | Permanent | Un nouveau certificat doit être déployé |
| `DAT_CERT_EXPIRED` | Tout le stock est expiré | Permanent | Les certificats doivent être renouvelés |
| `DAT_CERT_VERIFY_ONLY` | Tout le stock est en vérification seule | Permanent | **Une erreur de configuration de déploiement** |

Si le serveur émetteur est configuré pour ne recevoir que des certificats de vérification, `DAT_CERT_VERIFY_ONLY` apparaît. Attendre n'y changera jamais rien : ce n'est donc pas un cas de nouvelle tentative.

---

## Configuration

Problèmes portant sur les valeurs transmises par l'appelant. La famille `CONFIG` regroupe uniquement des **erreurs à corriger dans le code** ; si elles surviennent en exploitation, c'est que le déploiement est incorrect.

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="Vérifier le nom de l'algorithme">
Nom d'algorithme inconnu. Il doit correspondre exactement à la notation de transport (<code>ECDSA-P256</code>, <code>IV-AES256-GCM</code>).
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="Corriger le code appelant">
Un argument obligatoire est null, se situe hors de la plage autorisée (valeur temporelle négative, <code>interval &lt;= 0</code>), est d'un type non pris en charge (un nombre ou un booléen passé en charge utile dans un langage à typage dynamique), ou le corps à signer est vide.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="Corriger l'URI">
L'URI du serveur CMS n'est pas conforme. Non analysable, schéma autre que http/https, ou présence d'un chemin ou d'une chaîne de requête.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="Consulter les journaux">
Une erreur de configuration qui ne se range dans aucune des catégories ci-dessus.
</ErrorCode>

---

## Interne

Problèmes de l'environnement d'exécution et du runtime.

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="Vérifier le déploiement et la plateforme">
Le backend cryptographique ou l'API du runtime est purement et simplement absent. <code>crypto.subtle</code> manquant, plateforme sans prise en charge d'AES-GCM, ou version de runtime insuffisante.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="Consulter les journaux">
Échec d'allocation mémoire, échec de génération d'aléa, échec d'acquisition de verrou, ou branche conçue comme inatteignable qui a été atteinte.
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` se résout en corrigeant l'environnement de déploiement ; `DAT_INTERNAL_UNKNOWN` relève généralement d'une défaillance du runtime ou d'un bug de la bibliothèque.

---

## Synchronisation CMS

Sans synchronisation CMS, ces codes n'apparaissent pas.

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="Réessayer après un backoff">
Échec DNS, connexion refusée, échec TLS, <strong>délai dépassé</strong>. Le délai dépassé n'a pas de code propre et est inclus ici — la réaction est la même.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="Vérifier la configuration du token">
Le serveur a répondu 401. Le token est absent ou incorrect.
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="Vérifier le niveau du token">
Le serveur a répondu 403. Le token est valide mais n'a pas les droits sur cet endpoint.
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="Vérifier la configuration de l'URL">
Le serveur a répondu 404. L'URL est incorrecte.
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="Réessayer après un backoff">
Le serveur a répondu 5xx.
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="Vérifier le code de statut">
Une réponse non-2xx qui ne correspond à aucun des cas ci-dessus.
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="Vérifier la version du serveur">
La réponse ne comporte pas de ligne de version, la ligne de version n'est pas un décimal pur, ou elle dépasse la plage.
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="Vérifier CERT_* / KEY_* dans cause">
La réponse est bien arrivée, mais les certificats n'ont pas pu être appliqués. <strong>L'origine est portée par <code>cause</code>.</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="Traité automatiquement">
Le serveur a renvoyé une version antérieure à la nôtre. C'est l'instruction de resynchronisation complète.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="Attendre la première synchronisation">
Aucune synchronisation n'a encore réussi.
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
La synchronisation précédente tourne encore, ce cycle a donc été sauté. Ce n'est pas une erreur.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="Vérifier les options de compilation">
La fonctionnalité CMS n'est pas incluse dans la compilation. Feature désactivée ou CURL absent.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="Consulter les journaux">
Une erreur CMS qui ne se range dans aucune des catégories ci-dessus.
</ErrorCode>

Les codes pour lesquels la synchronisation est jugée **définitivement en échec** (`UNAUTHORIZED`, `FORBIDDEN`, `ENDPOINT_NOT_FOUND`, `MALFORMED`, `IMPORT_FAILED`) sont tous critiques. Réessayer n'y change rien alors que les certificats continuent d'expirer : laissé sans réaction, le service finira nécessairement par s'arrêter.

À l'inverse, `UNREACHABLE` et `SERVER_ERROR` sont partiels. Tout continue avec les certificats en place et la synchronisation se rétablit d'elle-même au cycle suivant — **mais si les échecs se répètent, on bascule à terme en critique.** Placez l'alerte sur le nombre d'échecs consécutifs.

::: tip Les échecs de synchronisation ne sont pas levés en exception
Même si la première synchronisation échoue, le gestionnaire est renvoyé normalement — il vaut mieux que la synchronisation finisse par aboutir, même tardivement. L'échec est en revanche conservé comme **état consultable**.

| Client | Consultation |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

Si aucune synchronisation n'a jamais réussi, on y trouve `DAT_CMS_NOT_SYNCED` ; en fonctionnement normal, la valeur est vide.
:::

---

## Serveur

Codes émis par le serveur CMS. Les clients ne les **produisent pas, ils les reçoivent seulement**.

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
L'en-tête <code>Authorization</code> est absent, ou le token n'est enregistré à aucun niveau.
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
Le token est bien enregistré, mais pas au niveau exigé par cet endpoint.
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="Configurer un token immédiatement">
Aucun token n'est configuré, l'authentification est donc entièrement désactivée. <strong>Même l'API d'émission de certificats est alors ouverte sans authentification.</strong> N'apparaît pas dans la réponse, uniquement dans le journal de démarrage.
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
Les paramètres de chemin ou de requête sont ininterprétables, ou un argument est hors de la plage autorisée (delay négatif, plus de dix ans, etc.).
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
Le nom d'algorithme du chemin de la requête est inconnu.
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
Cette route n'existe pas, ou la méthode diffère.
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
La taille du corps de la requête est dépassée.
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
Une erreur de requête qui ne se range dans aucune des catégories ci-dessus.
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="Réessayer après un backoff">
Connexion à la base perdue, pool de connexions épuisé, contention de verrou, délai dépassé. <strong>Le seul code qui utilise 503</strong> — le signal qui permet au client de savoir que « cela s'arrangera en attendant ».
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="Vérifier l'état de la base">
Échec de lecture ou d'écriture, table absente, schéma non concordant, ligne de certificat corrompue.
</ErrorCode>

Enveloppe de réponse :

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

Pour les erreurs survenant lors de la création et de la manipulation des certificats, le serveur utilise tels quels les codes communs ci-dessus (`DAT_CERT_*`, `DAT_KEY_*`, `DAT_CONFIG_*`).

### À la réception d'un code serveur

Le client enveloppe le code serveur dans son propre code `CMS` et conserve l'original dans `cause`.

| Reçu | HTTP | Code émis par le client |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (autres) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (rétrogradation de version) | 200 | `DAT_CMS_VERSION_RESET` |

---

## Rechercher par symptôme

| Symptôme | Code |
| --- | --- |
| Cela fonctionne juste après la connexion, puis c'est rejeté peu après | `DAT_TOKEN_EXPIRED` — La durée de vie du token est écoulée. Une réémission suffit |
| La vérification n'échoue que sur un serveur précis | `DAT_CERT_NOT_SYNCED` — Ce serveur n'a pas encore reçu le nouveau CID |
| Le même token est rejeté sur tous les serveurs | `DAT_CERT_NOT_FOUND` — Un CID que nous n'avons jamais émis |
| Le serveur émetteur n'arrive pas à créer de token | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **Le déploiement est en verify-only** |
| L'émission n'échoue que juste après le démarrage | `DAT_MANAGER_NO_CERTIFICATE` — Avant la première synchronisation. Cela se résout sous peu |
| La synchronisation CMS échoue continuellement | `DAT_CMS_UNAUTHORIZED` — Le token est incorrect. Réessayer n'y change rien |
| Aucun certificat n'arrive | `DAT_CMS_ENDPOINT_NOT_FOUND` — Une faute de frappe dans l'URL |
| L'échec ne se produit que sur une plateforme précise | `DAT_INTERNAL_UNAVAILABLE` — Le backend cryptographique est absent |
| Les échecs de vérification augmentent brusquement | `DAT_SIG_MISMATCH` — Isolé c'est inoffensif, mais **en rafale c'est une tentative de falsification** |
| Le déchiffrement de secure échoue brusquement | `DAT_CRYPTO_TAG_MISMATCH` — Certificats désalignés ou **tentative d'altération** |
| Avertissement dans le journal de démarrage du CMS | `DAT_AUTH_DISABLED` — **L'authentification est désactivée.** L'API d'émission est ouverte |

---

## Annexe

### Syntaxe des codes

```
DAT_<domaine>_<cause>
```

- Lorsqu'une même cause survient dans des domaines différents, **le nom de la cause est identique.** `DAT_TOKEN_MALFORMED` et `DAT_CERT_MALFORMED` ne diffèrent que par l'objet concerné, le sens est le même.
- `_UNKNOWN` est **réservé au repli** de chaque domaine. Il n'est pas employé dans un autre sens, par exemple « algorithme inconnu » (c'est `_UNSUPPORTED` qui sert à cela).
- La chaîne de code est un contrat public. Le message peut être modifié librement, le code non.

| Catégorie | Préfixe de code |
| --- | --- |
| Token | `DAT_TOKEN_` |
| Certificat | `DAT_CERT_` |
| Signature | `DAT_SIG_` |
| Chiffrement | `DAT_CRYPTO_` |
| Clé | `DAT_KEY_` |
| Gestionnaire | `DAT_MANAGER_` |
| Configuration | `DAT_CONFIG_` |
| Interne | `DAT_INTERNAL_` |
| Synchronisation CMS | `DAT_CMS_` |
| Serveur | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### Accès selon le client

| Client | Type d'erreur | Code | Classe de nouvelle tentative | Événement de sécurité |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| Serveur CMS | Enveloppe JSON | champ `code` | — | — |

`Événement de sécurité` ne renvoie `true` que pour les deux cas où la falsification ou l'altération est avérée (`DAT_SIG_MISMATCH`, `DAT_CRYPTO_TAG_MISMATCH`). L'étiquette **suspect** de ce document couvre un périmètre plus large (jusqu'aux tokens, clés et requêtes falsifiés) ; il ne s'agit pour l'instant que d'une classification documentaire, non exposée par l'API cliente.

Le niveau d'**impact** est lui aussi une classification documentaire. Un même code peut frapper différemment selon l'endroit où il survient — `DAT_KEY_INVALID` n'a par exemple aucun impact lorsqu'il sert à filtrer un token entrant, mais fait échouer toute la synchronisation lorsqu'il survient à la lecture d'un certificat pendant la synchronisation CMS.

**Les causes sous-jacentes ne sont pas perdues.** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` et `DAT_CMS_IMPORT_FAILED` transmettent l'origine via le chaînage d'exceptions propre à chaque langage (`cause` / `__cause__` / `InnerException` / `Unwrap()`).

::: warning C/C++ conserve aussi les valeurs entières
Les valeurs entières existantes de `dat_error_t` sont conservées pour la compatibilité ABI, mais **c'est le code textuel qui fait foi**. La bibliothèque ne renvoie plus les anciennes valeurs : une comparaison comme `err == DAT_ERROR_INVALID_DAT` n'est donc plus juste. Comparez plutôt via `dat_error_code(e)`.

C ne dispose pas de chaînage d'exceptions ; la cause se consulte séparément avec `dat_manager_issuable_cause()`.
:::

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>

<style scoped>
/* 범례 배지 — ErrorCode 컴포넌트의 배지와 같은 모양이라 눈으로 바로 이어진다. */
.lg {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
}
.lg          { background: color-mix(in srgb, currentColor 8%, transparent); opacity: 0.7; }
.lg-critical { background: color-mix(in srgb, #dc2626 16%, transparent); color: #dc2626; opacity: 1; }
.lg-partial  { background: color-mix(in srgb, #ea580c 16%, transparent); color: #ea580c; opacity: 1; }
.lg-none     { background: color-mix(in srgb, currentColor 8%, transparent); color: var(--c-muted); opacity: 1; }
.lg-suspect  { background: none; border: 1px solid color-mix(in srgb, var(--c-accent-2) 55%, transparent); color: var(--c-accent-2); opacity: 1; }
.lg-transient { background: color-mix(in srgb, var(--c-link-1) 16%, transparent); color: var(--c-link-1); opacity: 1; }
</style>
