
# DAT (Distributed Access Token)

---

## Contexte d'introduction du DAT

Aujourd'hui, de nombreux systèmes adoptent JWT, mais des limitations structurelles subsistent dans les environnements de production réels.<br/>
C'est pour les résoudre qu'une nouvelle spécification de token, DAT, a été conçue.

#### 🧩 Fragmentation des spécifications de sécurité et absence de caractère obligatoire
JWT fournit des standards de chiffrement tels que JWE, mais leur utilisation n'est pas imposée. <br/>
En conséquence, de nombreux environnements de développement omettent le chiffrement ou transmettent les données par des méthodes non standard, ce qui engendre des vulnérabilités de sécurité.

#### 🔑 Risque de sécurité lié à l'utilisation de clés statiques (Static Key)
La rotation des clés de signature (Key Rolling) n'étant pas obligatoire, il est fréquent qu'une clé unique soit utilisée pendant une longue période. Cela peut entraîner l'effondrement de la sécurité de tout le système en cas de vol de la clé ; des incidents de compromission de ce type se sont d'ailleurs produits sur de grands sites de commerce en ligne.

#### 📉 Dégradation des performances due à la surcharge
JWT effectue une analyse JSON à chaque requête et consomme des ressources CPU considérables. Dans les environnements exigeant de hautes performances, ce coût d'analyse peut devenir le goulot d'étranglement de l'ensemble du système.

---

## Philosophie centrale du DAT

DAT est conçu selon le principe que la sécurité doit être imposée et non optionnelle, et que les performances ne sont pas négociables.

#### ⚡ Léger et rapide

<WireFormat
    hint="Survolez chaque champ pour afficher son explication."
    :segments="[
        {name: 'expire', type: 'uint64 (décimal)', kind: 'meta', note: 'Date d’expiration. Imposée par la spécification, elle ne peut pas être omise.'},
        {name: 'cid', type: 'uint64 (hexadécimal)', kind: 'meta', note: 'ID du certificat à utiliser pour la vérification.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Données exposées au client.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Données chiffrées. Illisibles sans le certificat.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signature portant sur les quatre champs précédents.'},
    ]"
/>

Comme ci-dessus, DAT ne comporte que cinq champs fixes séparés par des points (`.`). La position de chaque champ étant fixée par la spécification, il suffit de repérer les séparateurs pour découper chaque valeur, sans aucune analyse JSON.

#### 🔐 Sécurité imposée

Lors de la transmission des données, DAT sépare physiquement la zone en clair (Plain) et la zone **chiffrée (Secure)**.<br/>
Il impose que les informations sensibles soient obligatoirement chiffrées, et l'ensemble du processus est protégé par les algorithmes standard déclarés dans le certificat (ECDSA, AES-GCM, etc.).

L'algorithme de chiffrement est **déterminé par le certificat**, et non par le token. Aucune information d'algorithme n'étant présente dans le token, la surface d'attaque par confusion d'algorithme issue de l'en-tête `alg` de JWT n'existe pas.

#### 🔄 Rotation de clés imposée

Le certificat DAT gère directement **le cycle de vie des clés**, en plus de l'émission et de l'expiration des tokens.<br/>
Le certificat porte, au niveau de la spécification, l'information « de quand à quand l'émission est possible » : une fois cette période écoulée, il n'est plus possible de créer de nouveaux tokens avec ce certificat. La situation où, par négligence d'un administrateur, une même clé serait utilisée pendant des années ne peut structurellement pas se produire.

#### ⏱️ Séparation de la fenêtre d'émission et de la durée de validité

« La période pendant laquelle un certificat peut émettre des tokens » et « la durée de vie d'un token émis » sont deux valeurs distinctes.<br/>
Ainsi, même après que le certificat a cessé d'émettre, les tokens déjà distribués peuvent aller au bout de leur durée de vie, pendant que le cluster bascule naturellement vers le certificat suivant.

---

## Comparaison des mécanismes d'authentification

| Classification | **DAT**                       | **JWT** | **Session**           |
| --- |-------------------------------| --- |---------------------------|
| **Méthode d'authentification** | **Vérification distribuée**                     | Vérification distribuée | Centralisée          |
| **Structure des données** | **Raw Bytes<br/>(basé sur des décalages fixes)** | JSON<br/>(texte Key-Value) | Serialized Object<br/>(sérialisation d'objet) |
| **Mécanisme d'analyse** | **Mappage immédiat des données Byte**            | Analyse JSON et transtypage nécessaires | Désérialisation d'objet et I/O          |
| **Performance de traitement** | **Optimale (surcharge d'analyse minimale)**          | Moyenne (dépend des performances de traitement JSON) | Faible (I/O réseau/disque)         |
| **Chiffrement** | **Intégré par défaut**                     | Implémentation JWE distincte nécessaire (complexe) | Non applicable                     |
| **Gestion des clés** | **Rotation imposée par le système (sécurité imposée)**         | Implémentation manuelle (risque de négligence) | Non applicable                     |
| **Durée de validité des clés** | **Imposée et explicite dans la spécification des clés**              | Optionnelle (permanente en l'absence de gestion) | Gérée par le serveur central                  |
| **Choix de l'algorithme** | **Déterminé par le certificat (absent du token)**          | Champ `alg` de l'en-tête du token | Non applicable                     |
| **Date d'expiration** | **Champ obligatoire par spécification**                 | Claim optionnel (`exp`) | Géré par le serveur                   |

---

## {{t('bench_title')}} {#performance}

<BenchBars />

---

## Documents suivants

- [{{t('menu_spec_dat')}}](./spec/dat) — format de trame du token et règles canoniques
- [{{t('menu_spec_cert')}}](./spec/dat-certificate) — structure du certificat, algorithmes, cycle de vie
- [{{t('menu_spec_cms')}}](./spec/cms) — distribution des certificats et comportements à connaître en exploitation

<script setup lang="ts">
import {useTranslate} from "../.vitepress/src/langs";
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import BenchBars from "../.vitepress/ui/BenchBars.vue";
const {t} = useTranslate();
</script>
