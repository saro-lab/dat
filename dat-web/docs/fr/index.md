---
layout: home
---

<script setup lang="ts">
import {useRoot} from "../.vitepress/src/langs";
import {getLibTags} from "../.vitepress/src/libs";
import DatExample from "../.vitepress/ui/DatExample.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
import WireFormat from "../.vitepress/ui/WireFormat.vue";

const root = useRoot();
const tags = getLibTags(root.value);
const TAG_ICON: Record<string, string> = {
    Rust: '🦀', Cargo: '📦', Java: '☕', Kotlin: '🟣', Maven: '📦',
    JavaScript: '🟨', TypeScript: '🔷', Npm: '📦', Python: '🐍', Pypi: '📦',
    'C#': '🟩', Nuget: '📦', Go: '🐹', Ruby: '💎', Gems: '📦',
    'C++': '🔧', C: '🔧', Vcpkg: '📦',
};
function tagIcon(name: string): string {
    return TAG_ICON[name] || (name === '...' ? '' : '📦');
}
const features = [
    {icon: '⏱️', title: 'L’expiration fait partie de la spécification', desc: 'Chaque DAT possède une date d’expiration. La durée de vie du jeton n’est pas interprétée séparément par chaque application.'},
    {icon: '🔏', title: 'Les zones publique et chiffrée sont distinctes', desc: 'Placez dans plain les valeurs nécessaires au routage et dans secure celles qui ne doivent pas être exposées.'},
    {icon: '🔑', title: 'Les certificats sélectionnent les clés', desc: 'Le cid du jeton désigne le certificat utilisé pour la vérification. Les jetons existants restent vérifiables pendant la rotation des clés.'},
    {icon: '🌐', title: 'Les services ne s’interrogent pas entre eux', desc: 'Lorsque chaque service détient les mêmes certificats, les serveurs d’émission et de vérification peuvent fonctionner séparément.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT est un jeton d’accès que plusieurs services émettent et vérifient selon la même spécification. Un jeton contient une date d’expiration,
un ID de certificat, des données publiques, des données chiffrées et une signature. Le serveur de vérification contrôle le jeton avec son propre certificat au lieu d’interroger le serveur d’émission à chaque fois.
</div>

<div class="hero-desc">
Un certificat regroupe les méthodes de signature et de chiffrement du jeton, les clés, la période d’émission et le TTL. Avec DAT CMS, les services peuvent synchroniser
des certificats complets ou verify-only au lieu de les distribuer eux-mêmes.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Fonctionnement</div>

<ArchFlow
    :user="{label: 'Utilisateur', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Créer et stocker les certificats', 'Distribuer les certificats aux services']}"
    :service="{servers: [
        {label: 'Service d’émission', kind: 'issuer', icon: 'login', request: 'Demande d’authentification', response: 'Émettre un DAT', sync: 'Synchroniser les certificats utilisables pour l’émission'},
        {label: 'Service de vérification', kind: 'verifier', icon: 'apps', request: 'Requête avec DAT', response: 'Répondre après vérification', sync: 'Synchroniser les certificats verify-only'},
    ]}"
/>

<div class="hero-desc">
Le service d’émission crée des DAT avec des certificats complets, tandis que le service de vérification les contrôle avec des certificats verify-only.
DAT CMS est facultatif ; les environnements qui distribuent directement les certificats peuvent utiliser uniquement le gestionnaire local du client.
</div>

<div class="section-title">Structure d’un DAT</div>

<WireFormat
    hint="Survolez chaque champ pour afficher sa description."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'L’heure Unix à laquelle le DAT expire.'},
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'L’ID du certificat utilisé pour la vérification.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Les bytes publics non chiffrés.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Les bytes protégés par AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'La signature qui vérifie tous les champs précédents.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">Commencer avec DAT</div>
        <div class="cta-desc">Découvrez dans l’ordre le rôle des jetons, des certificats, des services d’émission et de vérification.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">Bibliothèques</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
