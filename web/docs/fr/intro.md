# DAT (Distributed Access Token)

---

## Contexte d'introduction du DAT

Aujourd'hui, de nombreux systèmes adoptent JWT, mais des limitations structurelles existent dans les environnements de production réels comme suit.<br/>
Pour résoudre ces problèmes, la nouvelle spécification de token, DAT, a été conçue.

#### 🧩 Fragmentation des spécifications de sécurité et manque d'application
JWT fournit des standards de chiffrement tels que JWE, mais leur utilisation n'est pas imposée. <br/>
En conséquence, de nombreux environnements de développement omettent le chiffrement ou transmettent des données en utilisant des méthodes non standard, entraînant des vulnérabilités de sécurité.

#### 🔑 Risques de sécurité liés à l'utilisation de clés statiques
Étant donné que la rotation des clés de signature n'est pas obligatoire, les clés uniques sont fréquemment utilisées pendant de longues périodes. Cela peut entraîner un effondrement complet de la sécurité du système si une clé est compromise ; des incidents de violation causés par cela ont été constatés sur des sites e-commerce à grande échelle.

#### 📉 Dégradation des performances due à la surcharge
JWT passe par un processus d'analyse JSON pour chaque requête, ce qui consomme des ressources CPU significatives. Dans les environnements à haute performance, ce coût d'analyse peut devenir un goulot d'étranglement majeur pour l'ensemble du système.


## Philosophie centrale du DAT

DAT est conçu sous les principes que la sécurité doit être obligatoire plutôt qu'optionnelle, et que la performance ne peut pas être compromise.

#### ⚡ Léger et rapide

```expire```.```cid```.```plain```.```secure```.```signature```

DAT présente une structure de données légère comme indiqué ci-dessus.

#### 🔐 Sécurité imposée

DAT sépare physiquement les régions de texte brut (Plain) et **chiffrées (Secure)** lors de la transmission des données.<br/>
Il impose que les informations sensibles doivent être chiffrées, et l'ensemble du processus est protégé par des algorithmes standardisés (P256, AES-GCM, etc.) via `DatKey`.

#### 🔄 Rotation des clés imposée

`DatKey`, le cœur du système DAT, gère directement **le cycle de vie des clés** ainsi que l'émission et l'expiration des tokens.<br/>
Il est conçu pour faire pivoter régulièrement les clés au niveau du système, empêchant fondamentalement les « incidents de sécurité à clé statique » causés par la négligence des administrateurs.

---

## Comparaison des mécanismes d'authentification

| Classification | **DAT** | **JWT** | **Session** |
| --- |-------------------------------| --- |---------------------------|
| **Méthode d'authentification** | **Vérification distribuée** | Vérification distribuée | Centralisé          |
| **Structure des données** | **Raw Bytes<br/>(Basé sur un offset fixe)** | JSON<br/>(Basé sur du texte Key-Value) | Serialized Object<br/>(Sérialisation d'objet) |
| **Mécanisme d'analyse** | **Mappage immédiat des données Byte** | Nécessite une analyse JSON et un transtypage | Nécessite une désérialisation d'objet et des I/O          |
| **Performance de traitement** | **La plus haute (surcharge d'analyse minimale)** | Modérée (dépend des performances de traitement JSON) | Faible (I/O réseau/disque)         |
| **Chiffrement** | **Intégré par défaut** | Nécessite une implémentation JWE séparée (complexe) | Non applicable                     |
| **Gestion des clés** | **Rotation système imposée (sécurité renforcée)** | Nécessite une implémentation directe (risque de gestion négligente) | Non applicable                     |
| **Période de validité des clés** | **Imposée et explicite dans la spécification des clés** | Optionnel (permanent si non géré) | Géré par le serveur central                  |
