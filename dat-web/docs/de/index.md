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
    {icon: '⏱️', title: 'Der Ablauf ist Teil der Spezifikation', desc: 'Jeder DAT hat einen Ablaufzeitpunkt. Die Gültigkeitsdauer des Tokens muss nicht in jeder Anwendung separat interpretiert werden.'},
    {icon: '🔏', title: 'Öffentlicher und verschlüsselter Bereich sind getrennt', desc: 'Werte für das Routing gehören in plain, Werte, die nicht offengelegt werden dürfen, in secure.'},
    {icon: '🔑', title: 'Das Zertifikat bestimmt den Schlüssel', desc: 'Die cid des Tokens verweist auf das Zertifikat für die Prüfung. Auch während eines Schlüsselwechsels bleiben bestehende Tokens prüfbar.'},
    {icon: '🌐', title: 'Dienste fragen einander nicht direkt ab', desc: 'Wenn jeder Dienst dasselbe Zertifikat besitzt, können Aussteller und Prüfdienst getrennt betrieben werden.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT ist ein Zugriffstoken, das mehrere Dienste nach derselben Spezifikation ausstellen und prüfen. Das Token enthält Ablaufzeitpunkt, Zertifikat-ID,
öffentliche Daten, verschlüsselte Daten und eine Signatur. Der Prüfdienst kontrolliert das Token mit seinem eigenen Zertifikat, ohne jedes Mal den Aussteller zu fragen.
</div>

<div class="hero-desc">
Ein Zertifikat bündelt Verfahren und Schlüssel für Signatur und Verschlüsselung sowie Ausstellungszeitraum und TTL. Mit DAT CMS können Dienste vollständige oder
nur zur Prüfung bestimmte Zertifikate synchronisieren, ohne Zertifikate manuell an jeden Dienst zu verteilen.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Ablauf der Nutzung</div>

<ArchFlow
    :user="{label: 'Benutzer', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Zertifikate erstellen und speichern', 'Zertifikate an Dienste übermitteln']}"
    :service="{servers: [
        {label: 'Ausstellender Dienst', kind: 'issuer', icon: 'login', request: 'Authentifizierungsanfrage', response: 'DAT ausstellen', sync: 'Ausstellungsfähige Zertifikate synchronisieren'},
        {label: 'Prüfdienst', kind: 'verifier', icon: 'apps', request: 'Anfrage mit DAT', response: 'Antwort nach der Prüfung', sync: 'Zertifikate nur zur Prüfung synchronisieren'},
    ]}"
/>

<div class="hero-desc">
Der ausstellende Dienst erstellt DAT mit dem vollständigen Zertifikat, der Prüfdienst kontrolliert DAT mit einem nur zur Prüfung bestimmten Zertifikat.
DAT CMS ist optional. In Umgebungen, die Zertifikate direkt verteilen, genügt der lokale Manager des Clients.
</div>

<div class="section-title">DAT-Aufbau</div>

<WireFormat
    hint="Bewegen Sie den Mauszeiger über ein Feld, um seine Beschreibung anzuzeigen."
    :segments="[
        {name: 'expire', type: 'uint64 (dezimal)', kind: 'meta', note: 'Unix time, zu der DAT abläuft.'},
        {name: 'cid', type: 'uint64 (hexadezimal)', kind: 'meta', note: 'ID des Zertifikats für die Prüfung.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Öffentliche, unverschlüsselte Bytes.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Mit AES-GCM geschützte Bytes.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signatur zur Prüfung aller vorherigen Felder.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">DAT kennenlernen</div>
        <div class="cta-desc">Token, Zertifikat sowie die Aufgaben von Aussteller und Prüfdienst werden der Reihe nach erklärt.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">Bibliotheken</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
