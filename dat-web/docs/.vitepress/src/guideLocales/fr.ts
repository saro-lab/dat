import type { SharedGuideLocale } from './types'

export const frGuideLocale: SharedGuideLocale = {
  libraryIndex: {
    title: 'Bibliothèques',
    intro: 'Sélectionnez le client DAT correspondant au langage de votre application. Tous les clients utilisent les mêmes spécifications DAT et de certificat, et proposent la gestion locale des certificats ainsi que la synchronisation avec DAT CMS.',
    criteriaTitle: 'Comment choisir',
    criteriaBody: 'Un service qui émet des DAT doit pouvoir utiliser des certificats complets. Un service qui se limite à vérifier et déchiffrer doit utiliser des certificats ECDSA verify-only et le rôle verify-only du CMS.',
    flowTitle: 'Structure du guide',
    flowBody: 'Chaque guide de bibliothèque présente l’installation, le flux d’émission et de vérification le plus simple, la connexion à DAT CMS, la politique de synchronisation, l’arrêt et la gestion des erreurs.',
  },
  library: {
    titleSuffix: 'Bibliothèque', install: 'Installation', quickTitle: 'Démarrage rapide',
    quickIntro: 'Ce flux complet récupère les certificats depuis le CMS, crée un DAT contenant des données JSON et le vérifie.',
    stepTitle: 'Étape par étape', connectTitle: '1. Se connecter au CMS',
    connectBody: 'Un service d’émission utilise un token donnant accès aux certificats complets. Une synchronisation immédiate au démarrage évite toute émission avant la disponibilité des certificats.',
    issueTitle: '2. Émettre un DAT', issueBody: 'Cet exemple place le JSON public dans `plain` et les informations utilisateur protégées, également en JSON, dans `secure`.',
    parseTitle: '3. Vérifier un DAT', parseBody: '`parse` vérifie l’expiration et la signature, puis déchiffre `secure`. N’utilisez qu’un payload renvoyé après une vérification réussie.',
    functionsTitle: 'Fonctions principales', functionHeader: 'Fonction', purposeHeader: 'Rôle', dataTitle: 'Zones de données',
    plainBody: 'bytes signés mais non chiffrés.', secureBody: 'bytes chiffrés.', payloadBody: 'ne lui faites confiance qu’après la réussite de `parse`.',
    optionsTitle: 'Autres options que JSON', optionsBody: 'Les exemples utilisent le format JSON courant. Pour accélérer le traitement, les données binaires peuvent éviter la sérialisation et l’analyse JSON tout en réduisant la taille des données.',
    formatsBody: 'Stockez les valeurs simples sous forme de texte, ou placez des données structurées dans des formats binaires comme Protobuf ou MessagePack dans `plain` et `secure`.',
    verifyTitle: 'Services verify-only', verifyBody: 'Un service qui n’émet pas de DAT utilise l’option verify-only et un token verify-only, et appelle uniquement `parse`.',
    lifecycleTitle: 'Arrêt et erreurs', errorsBefore: 'Utilisez les ', errorsLink: 'codes d’erreur et classifications de retry', errorsAfter: ' plutôt que les messages d’erreur.',
  },
  guides: {
    rust: {
      binaryNote: 'Comme `issue` accepte actuellement des chaînes, encodez les bytes arbitraires en Base64Url ou Hex, puis décodez-les après la vérification.',
      lifecycle: 'La tâche de synchronisation automatique se termine lorsque le dernier `Arc<DatCmsManager>` est supprimé.',
      apiPurposes: ['Synchronise immédiatement les certificats.', 'Crée un DAT avec le certificat d’émission actuel.', 'Vérifie un DAT et renvoie son payload.', 'Renvoie la dernière erreur de synchronisation.'],
    },
    java: {
      binaryNote: 'La surcharge `ByteArray` stocke et récupère directement les bytes sans format supplémentaire.',
      lifecycle: '`DatCmsManager` implémente `AutoCloseable` ; fermez-le avec `use` ou `close()`.',
      apiPurposes: ['Synchronise immédiatement les certificats et signale l’échec.', 'Crée un DAT et renvoie un DatResult.', 'Vérifie un DAT et renvoie un Payload.', 'Renvoie la dernière erreur de synchronisation en arrière-plan.'],
    },
    javascript: {
      binaryNote: 'Transmettez un `Uint8Array` ou un `ArrayBuffer`, puis récupérez les bytes originaux via `plainBytes` et `secureBytes`.',
      lifecycle: 'Appelez `stop()` à l’arrêt pour nettoyer les timers et les requêtes en cours.',
      apiPurposes: ['Synchronise immédiatement les certificats.', 'Crée une chaîne DAT de façon asynchrone.', 'Vérifie un DAT et renvoie un DatPayload.', 'Renvoie la dernière erreur de synchronisation.'],
    },
    python: {
      binaryNote: 'Transmettez directement des `bytes` et récupérez-les via `plain_bytes` et `secure_bytes`.',
      lifecycle: 'Lorsque la synchronisation automatique est activée, appelez `stop()` à l’arrêt.',
      apiPurposes: ['Synchronise immédiatement les certificats.', 'Crée une chaîne DAT.', 'Vérifie un DAT et renvoie un DatPayload.', 'Renvoie la dernière erreur de synchronisation.'],
    },
    csharp: {
      binaryNote: 'Utilisez la surcharge `byte[]` ainsi que `PlainBytes` et `SecureBytes`.',
      lifecycle: 'Utilisez `await using` pour nettoyer le gestionnaire et la synchronisation en arrière-plan.',
      apiPurposes: ['Synchronise immédiatement les certificats.', 'Crée une chaîne DAT.', 'Vérifie un DAT et renvoie un Payload.', 'Renvoie la dernière erreur de synchronisation.'],
    },
    go: {
      binaryNote: 'Les chaînes Go peuvent contenir des bytes. Transmettez une tranche de bytes sous forme de `string`, puis reconvertissez le résultat en `[]byte`.',
      lifecycle: 'Lorsque la synchronisation automatique est activée, utilisez `defer cms.Close()` pour garantir le nettoyage.',
      apiPurposes: ['Synchronise immédiatement les certificats.', 'Renvoie une chaîne DAT et une erreur.', 'Renvoie un Payload vérifié et une erreur.', 'Renvoie la dernière erreur de synchronisation.'],
    },
    ruby: {
      binaryNote: 'Transmettez des chaînes binaires et récupérez-les via `plain_bytes` et `secure_bytes`.',
      lifecycle: 'Lorsque la synchronisation automatique est activée, appelez `stop` pour terminer le thread en arrière-plan.',
      apiPurposes: ['Synchronise immédiatement les certificats.', 'Crée une chaîne DAT.', 'Vérifie un DAT et renvoie un DatPayload.', 'Renvoie la dernière erreur de synchronisation.'],
    },
    c: {
      binaryNote: 'L’API d’émission C actuelle accepte des chaînes terminées par NUL. Encodez les bytes arbitraires en Base64Url ou Hex et lisez le résultat à l’aide des longueurs du payload.',
      lifecycle: 'Libérez `dat`, `payload` et `cms` avec leurs fonctions de nettoyage respectives.',
      apiPurposes: ['Synchronise immédiatement les certificats.', 'Alloue et renvoie une chaîne DAT.', 'Alloue et renvoie un payload vérifié.', 'Renvoie la dernière erreur de synchronisation.'],
      parse: `dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);
/* Utilisez plain_bytes et secure_bytes avec leurs longueurs respectives. */`,
      binary: `/* Encodez d’abord les données contenant NUL, car issue accepte des chaînes C. */
const char *secure_hex = "00ff1080";
char *dat = NULL;
err = dat_cms_manager_issue(cms, "01", secure_hex, &dat);

dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);`,
    },
  },
  cms: {
    introBefore: 'DAT CMS crée les certificats, les stocke dans une base de données et fournit les certificats appropriés aux services d’émission et de vérification. Le comportement du protocole est décrit dans la ',
    specLink: 'spécification DAT CMS', introAfter: '.', configTitle: 'Créer une configuration de runtime', dockerTitle: 'Exécuter avec Docker',
    dockerBody: 'Exécutez le conteneur avec un utilisateur non-root. Avec SQLite, montez un répertoire de données accessible en écriture. Transmettez les tokens et mots de passe de base de données par un mécanisme d’injection de secrets plutôt que par l’historique des commandes.',
    databaseTitle: 'Base de données',
    databaseBody1: 'Utilisez `DB_URI` pour configurer une connexion SQLite, PostgreSQL ou MySQL. MariaDB se connecte via le protocole MySQL. Le CMS met les résultats des requêtes de certificats en cache sous forme de snapshot et continue à servir le dernier snapshot réussi lorsqu’une actualisation du stockage échoue temporairement.',
    databaseBody2: '`DB_CACHE_SECS` définit l’intervalle d’actualisation du snapshot, tandis que `DB_QUERY_TIMEOUT_SECS` limite les requêtes d’actualisation. Si aucun snapshot réussi n’existe et que le stockage est illisible, le service renvoie `DAT_STORE_UNAVAILABLE`.',
    rolesTitle: 'Rôles d’accès', roleHeaders: ['Variable d’environnement', 'Autorisation', 'Utilisé par'],
    roleRows: [['Enregistrer des certificats et récupérer la version protégée', 'Exploitation'], ['Récupérer les certificats complets', 'Services d’émission DAT'], ['Récupérer les certificats verify-only', 'Services de vérification et de déchiffrement']],
    rolesNote: 'Chaque variable accepte des tokens alphanumériques séparés par des virgules. Si la liste de tokens d’un rôle est vide, les endpoints correspondants sont ouverts et un avertissement est consigné.',
    certificateTitle: 'Génération des certificats', certificateBody: 'Le rôle master enregistre un certificat en indiquant l’algorithme de signature, l’algorithme de chiffrement, le délai de propagation, la période d’émission et le TTL. Pendant le délai de propagation, les services synchronisent le nouveau certificat avant qu’il puisse servir à l’émission.',
    clientTitle: 'Intégration du client', clientSteps: ['Utilisez le token complet et l’endpoint des certificats complets pour les services d’émission.', 'Utilisez le token de vérification et l’option verify-only pour les services de vérification.', 'Contrôlez le résultat de la première synchronisation ; si le démarrage doit échouer, appelez l’API de synchronisation immédiate.', 'Lorsque la synchronisation automatique est activée, fermez le gestionnaire à l’arrêt de l’application.'],
    libraryBefore: 'Consultez les ', libraryLink: 'guides des bibliothèques', libraryAfter: ' pour le builder et le comportement d’arrêt propres à chaque langage.',
    operationsTitle: 'Contrôles d’exploitation', operationsItems: ['`/health` et `/version/api` indiquent l’état sans authentification.', '`/version` exige le master token lorsque ce rôle est configuré.', 'Collectez les journaux de la sortie standard et de l’erreur standard.', 'Transmettez les signaux d’arrêt et laissez à la base de données et au scheduler le temps de se fermer.'],
    kubernetesTitle: 'Kubernetes', kubernetesBody: 'Faites correspondre le port du conteneur et les probes au port du service, puis montez le répertoire de données avec un accès en écriture pour l’utilisateur non-root. Injectez les tokens et les informations de connexion à la base de données au moyen de Secrets.',
  },
}
