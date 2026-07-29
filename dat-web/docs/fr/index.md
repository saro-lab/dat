---
layout: home
---

<script setup lang="ts">
import {useRoot, useTranslate} from "../.vitepress/src/langs";
import {getLibTags} from "../.vitepress/src/libs";
import DatExample from "../.vitepress/ui/DatExample.vue";

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
    {icon: '⚡', title: 'Protocole à trames binaires', desc: "Conçu dès le départ avec des champs binaires de largeur fixe, lus directement par décalage d'octets sans passe d'analyse — émission et vérification avec un surcoût minimal, sans aucun encodage/décodage JSON."},
    {icon: '🔐', title: 'Rotation de clés obligatoire', desc: "Les certificats tournent automatiquement selon un calendrier fixe, le certificat suivant étant toujours prêt avant l'expiration de l'actuel — ce qui exclut structurellement l'incident classique de JWT où une clé reste inchangée pendant des années."},
    {icon: '⏱️', title: "Séparation fenêtre d'émission / TTL", desc: "La fenêtre d'émission d'un certificat et la durée de validité (TTL) d'un token sont suivies séparément, de sorte que les tokens déjà émis continuent d'être vérifiés jusqu'à l'expiration de leur TTL, même après que le certificat a cessé d'émettre de nouveaux tokens."},
    {icon: '🌐', title: 'Clients natifs pour les langages majeurs', desc: 'Clients officiels pour Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby et C/C++, chacun avec une API idiomatique pour son langage.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) est un token d'authentification distribué — chaque serveur qui émet ou vérifie des
sessions n'a besoin de s'accorder que sur une seule spécification. Construit sur des champs binaires de largeur
fixe, il lit et écrit directement par décalage sans passe d'analyse, et le protocole lui-même sépare la fenêtre
d'émission du TTL afin que la rotation des certificats (key rolling) puisse être imposée indépendamment du langage
ou de l'implémentation.
</div>

<div class="hero-desc">
Le DAT Certificate Management Service (CMS) génère, propage et fait expirer les certificats sur l'ensemble du
cluster selon une tâche cron planifiée, de sorte que les clés puissent tourner en toute sécurité sans qu'aucun
token déjà émis n'échoue jamais à la vérification pendant que d'autres serveurs finissent de se synchroniser sur
le nouveau certificat.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">{{t('dat_cms')}} Guide de déploiement</div>
        <div class="cta-desc">Kubernetes (multi-pod) · Docker · binaire (Linux, macOS, Windows) — générez une commande d'exécution dès maintenant</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">{{t('platform_support')}}</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

<div class="section-title">{{t('example')}}</div>

</div>

<DatExample />
