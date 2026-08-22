# Vibe coding avec l'IA

## Exemple de vibe coding

```
Applique DAT à l'authentification par session de ce serveur web.
C'est un token d'accès distribué comme JWT, et la documentation se trouve sur https://dat.saro.me/llms.txt
Commence par la lire. Télécharge l'intégralité de la documentation llms dans un dossier docs/dat et mets aussi à jour la documentation de l'agent.

- Projet : Java Spring Boot, avec Spring Security
- Objectif : remplacer la session par DAT
- Serveur DAT-CMS : http://localhost:8088 - à externaliser dans les propriétés
- Algorithme de signature : HMAC-SHA512-MFS
- Algorithme de chiffrement : IV-AES256-GCM
- Valeurs par défaut pour tout le reste

N'invente pas d'API qui ne figurent pas dans la documentation.
```


## Algorithmes

### Signature

| Algorithme | Caractéristiques |
| --- |---|
| `HMAC-SHA256-MFS`<br/>`HMAC-SHA384-MFS`<br/>`HMAC-SHA512-MFS` | · Basé sur le hachage<br/>· Clé symétrique<br/>· Rapide<br/>· [HMAC](https://en.wikipedia.org/wiki/HMAC) |
| `ECDSA-P256`<br/>`ECDSA-P384`<br/>`ECDSA-P521` | · Basé sur les courbes elliptiques<br/>· Clé asymétrique<br/>· Sécurité obtenue au prix de la vitesse<br/>· [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) |

- HMAC étant nettement plus rapide, si tout ce qui compte est d'empêcher les attaques venues de l'extérieur, c'est HMAC qu'il faut choisir.
- Grâce à sa structure à clé publique, ECDSA permet de séparer le serveur d'émission des serveurs de vérification. Sur un système de grande taille où les droits et les rôles sont déjà séparés, il renforce la sécurité face aux attaques internes.

### Chiffrement

| Nom | Longueur de clé |
| --- |---|
| `IV-AES128-GCM` | 128 bits |
| `IV-AES256-GCM` | 256 bits |

- Les données que DAT chiffre sont courtes : la différence mesurée entre 128 bits et 256 bits est donc quasi nulle.
- AES ne coûtant pratiquement rien, 256 bits est recommandé pour la marge de sécurité supplémentaire.


## Serveur DAT-CMS

**[Installer DAT-CMS](./svc/docker-saro-lab-dat-cms)**

DAT-CMS n'est pas obligatoire, mais son installation est fortement recommandée dès lors qu'il faut distribuer des certificats sur plusieurs serveurs et automatiser la rotation des clés (Key Rolling).

## Documents suivants

- [Qu'est-ce que DAT ?](./intro) - pourquoi DAT a été conçu
- [Spécification DAT](./spec/dat) - le format de trame du token
- [Toutes les bibliothèques](./libs/) - installation et exemples par langage
