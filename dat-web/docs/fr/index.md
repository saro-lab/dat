---
layout: home
---

<script setup lang="ts">
import {useRoot, useTranslate} from "../.vitepress/src/langs";
import {getLibTags} from "../.vitepress/src/libs";
import DatExample from "../.vitepress/ui/DatExample.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
import WireFormat from "../.vitepress/ui/WireFormat.vue";

const root = useRoot();
const {t} = useTranslate();
const tags = getLibTags(root.value);

/** Language/registry → emoji, purely decorative. Falls back to a generic package icon. */
const TAG_ICON: Record<string, string> = {
    Rust: '🦀', Cargo: '📦',
    Java: '☕', Kotlin: '🟣', Maven: '📦',
    JavaScript: '🟨', TypeScript: '🔷', Npm: '📦',
    Python: '🐍', Pypi: '📦',
    'C#': '🟩', Nuget: '📦',
    Go: '🐹',
    Ruby: '💎', Gems: '📦',
    'C++': '🔧', C: '🔧', Vcpkg: '📦',
};
function tagIcon(name: string): string {
    return TAG_ICON[name] || (name === '...' ? '' : '📦');
}

const features = [
    {icon: '⚡', title: 'Format de trame binaire', desc: "Conçu avec des champs binaires de largeur fixe, lus directement par décalage sans aucune passe d'analyse. Émission et vérification avec un surcoût minimal, sans encodage/décodage JSON."},
    {icon: '🔐', title: 'Rotation de clés obligatoire', desc: "Les certificats sont remplacés automatiquement selon un cycle défini, et le certificat suivant est toujours prêt avant l'expiration de l'actuel. L'incident d'exploitation classique de JWT — une clé qui reste inchangée pendant des années — est structurellement exclu."},
    {icon: '⏱️', title: "Séparation de la fenêtre d'émission et du TTL", desc: "La « période pendant laquelle un certificat peut émettre » et la « durée de validité des tokens émis » sont séparées : même après que le certificat a cessé d'émettre, les tokens déjà distribués continuent d'être vérifiés jusqu'à la fin de leur TTL."},
    {icon: '🌐', title: 'Clients natifs pour les langages majeurs', desc: 'Des clients officiels sont disponibles pour Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby et C/C++, chacun exposant une API idiomatique pour son langage.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) est un token d'authentification distribué : tous les serveurs qui émettent et vérifient
des sessions n'ont besoin de partager qu'une seule spécification. Construit sur des champs binaires de largeur fixe,
il lit et écrit directement par décalage, sans coût d'analyse, et sépare au niveau du protocole la fenêtre d'émission
du TTL afin que le renouvellement des certificats (rotation de clés) puisse être imposé indépendamment du langage et
de l'implémentation.
</div>

<div class="hero-desc">
Le DAT Certificate Management Service (CMS) prend automatiquement en charge la création, la propagation et
l'expiration des certificats sur l'ensemble du cluster selon une planification (Cron), ce qui permet de faire tourner
les clés en toute sécurité, sans qu'un token émis n'échoue à la vérification avant que tous les serveurs aient
totalement synchronisé le nouveau certificat.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Architecture globale</div>

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

<div class="hero-desc">
Seul le serveur de connexion reçoit des certificats capables d’émettre ; les serveurs de contenu ne reçoivent
que des certificats de vérification et contrôlent le DAT reçu. L’utilisateur ne s’adresse qu’à un seul service,
et un serveur de contenu n’a jamais à parler au serveur de connexion.
</div>

<div class="section-title">Structure du token</div>

<WireFormat
    hint="Survolez chaque champ pour afficher son explication."
    :segments="[
        {name: 'expire', type: 'uint64 (décimal)', kind: 'meta', note: 'Date d’expiration du token — imposée par la spécification.'},
        {name: 'cid', type: 'uint64 (hexadécimal)', kind: 'meta', note: 'ID du certificat à utiliser pour la vérification.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Données publiques, lisibles par n’importe qui.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Données chiffrées avec AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signature portant sur l’ensemble des quatre champs précédents.'},
    ]"
/>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">{{t('dat_cms')}} — Guide de déploiement</div>
        <div class="cta-desc">Kubernetes (multi-pods) · Docker · binaire (Linux, macOS, Windows) — générez votre commande d'exécution dès maintenant</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">{{t('platform_support')}}</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
