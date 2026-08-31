# Vibe coding avec l’IA

Décrivez à une IA votre projet actuel et le comportement souhaité afin de faciliter l’intégration de DAT. Dans les exemples ci-dessous, adaptez uniquement l’URL et les noms des variables d’environnement à votre projet.

## Implémentation simple

Utilisez ce prompt pour créer rapidement la structure de base.

```text
J’utilise Kotlin et Spring Boot.
Ajoute l’authentification DAT à Spring Security.

Commence par lire https://dat.saro.me/llms.txt, puis examine
la spécification DAT et la documentation de la bibliothèque officielle.

Vérifie le Bearer token de l’en-tête Authorization
et place les informations utilisateur dans SecurityContext lorsque l’authentification réussit.

Ce serveur n’émet pas de DAT ; il se contente de les vérifier.
Il doit recevoir des certificats verify-only depuis DAT CMS.

Commence par chercher dans le projet les paramètres d’URL du serveur CMS et du token.
Si tu ne les trouves pas, demande-les-moi. N’invente aucune valeur.

Utilise la bibliothèque DAT officielle pour Java/Kotlin
et respecte la structure et le style de code existants du projet.
```

## Implémentation détaillée

Utilisez ce prompt pour préciser le flux d’authentification et la gestion des erreurs.

```text
Ce projet utilise Kotlin, Spring Boot et Spring Security.
Examine la configuration de sécurité actuelle, puis ajoute l’authentification DAT.

Commence par lire https://dat.saro.me/llms.txt, puis examine
la spécification DAT, la synchronisation des certificats et l’API de la bibliothèque officielle.

Implémente les exigences suivantes.

- Lis le DAT depuis l’en-tête Authorization: Bearer.
- Si aucun DAT n’est présent, poursuis comme requête anonyme.
- Si le DAT est invalide ou expiré, réponds avec le statut 401.
- Après une vérification réussie, place l’ID utilisateur et les permissions dans SecurityContext.
- Ne lis dans plain que les valeurs pouvant être exposées sans risque.
- Lis l’ID utilisateur et les permissions dans les données secure vérifiées.
- Ce serveur est verify-only : utilise donc les certificats verify-only de DAT CMS.
- Lis l’URL du CMS et le token dans des variables d’environnement.
- Si la synchronisation des certificats échoue au démarrage, fais également échouer le démarrage de l’application.
- Actualise automatiquement les certificats pendant l’exécution et ferme le gestionnaire à l’arrêt.
- Distingue les causes d’échec avec les DAT error codes, pas avec les messages d’erreur.
- Ne consigne pas le DAT original, le token CMS ni les données personnelles.

Examine d’abord la configuration Spring Security et le modèle d’utilisateurs et de permissions du projet.
Si l’URL du CMS, la variable d’environnement du token ou le format des données secure ne sont pas clairs, demande avant d’implémenter.
Utilise uniquement l’API publique de la bibliothèque DAT officielle pour Java/Kotlin.

Avant de modifier le code, explique brièvement le flux d’authentification et les fichiers que tu vas changer.
```

## Quel exemple choisir ?

- Utilisez l’**Implémentation simple** si vous souhaitez d’abord obtenir du code fonctionnel.
- Utilisez l’**Implémentation détaillée** si vous avez besoin d’un flux d’authentification pour un environnement de production.

Si l’IA pose des questions, commencez par fournir l’URL du CMS, la variable d’environnement contenant le token et les informations utilisateur stockées dans `secure`.
