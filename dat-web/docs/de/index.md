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
    {icon: '⚡', title: 'Binäres Frame-Format', desc: 'Als binäre Felder fester Breite entworfen, sodass Werte ohne Parsing-Durchlauf direkt per Offset gelesen werden. Ausstellung und Verifizierung erfolgen mit minimalem Overhead, ganz ohne JSON-Kodierung und -Dekodierung.'},
    {icon: '🔐', title: 'Obligatorisches Key-Rolling', desc: 'Zertifikate werden nach einem festen Zeitplan automatisch ausgetauscht, und das nächste Zertifikat steht immer bereit, bevor das aktuelle abläuft. Der JWT-typische Betriebsvorfall, bei dem ein Schlüssel über lange Zeit unverändert bleibt, wird strukturell ausgeschlossen.'},
    {icon: '⏱️', title: 'Trennung von Ausstellungsfenster und TTL', desc: 'Das Ausstellungsfenster eines Zertifikats und die Gültigkeitsdauer der ausgestellten Tokens sind voneinander getrennt. Selbst nachdem ein Zertifikat keine neuen Tokens mehr ausstellt, werden bereits ausgegebene Tokens bis zum Ende ihrer TTL weiterhin verifiziert.'},
    {icon: '🌐', title: 'Native Clients für gängige Sprachen', desc: 'Offizielle Clients stehen für Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby und C/C++ bereit, jeweils mit einer für die Sprache idiomatischen API.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) ist ein verteiltes Authentifizierungstoken, bei dem alle Server, die Sitzungen ausstellen
und verifizieren, sich nur auf eine einzige Spezifikation einigen müssen. Es basiert auf binären Feldern fester Breite,
liest und schreibt Werte ohne Parsing-Kosten direkt per Offset, und trennt auf Protokollebene Ausstellungsfenster und TTL,
damit der Zertifikatswechsel (Key-Rolling) unabhängig von Sprache und Implementierung erzwungen werden kann.
</div>

<div class="hero-desc">
Der DAT Certificate Management Service (CMS) übernimmt Erzeugung, Verteilung und Ablauf der clusterweiten Zertifikate
automatisch nach einem geplanten Zeitplan (Cron). Dadurch lassen sich Schlüssel sicher rotieren, ohne dass Tokens,
die ausgestellt wurden, bevor alle Server das neue Zertifikat vollständig synchronisiert haben, an der Verifizierung scheitern.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Gesamtarchitektur</div>

<ArchFlow
    :user="{label: 'Nutzer', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Zertifikate je Gültigkeitsfenster', 'Abgelaufene werden aufgeräumt']}"
    :service="{servers: [
        {label: 'Login-Server', kind: 'issuer', icon: 'login',
         request: 'Anmeldeanfrage', response: 'Stellt DAT mit Zertifikat aus', sync: 'Sync der ausstellenden Zertifikate'},
        {label: 'Content-Server', kind: 'verifier', icon: 'apps',
         request: 'Inhaltsanfrage mit DAT', response: 'Prüft DAT und liefert aus', sync: 'Sync der reinen Prüfzertifikate'},
    ]}"
/>

<div class="hero-desc">
Nur der Login-Server erhält Zertifikate, mit denen er ausstellen darf; die Content-Server erhalten reine
Prüfzertifikate und kontrollieren damit das eingehende DAT. Der Nutzer hat es mit einem einzigen Dienst zu
tun, und ein Content-Server muss nie mit dem Login-Server sprechen.
</div>

<div class="section-title">Token-Struktur</div>

<WireFormat
    hint="Bewegen Sie den Mauszeiger über ein Feld, um dessen Beschreibung anzuzeigen."
    :segments="[
        {name: 'expire', type: 'uint64 (dezimal)', kind: 'meta', note: 'Ablaufzeit des Tokens — von der Spezifikation erzwungen.'},
        {name: 'cid', type: 'uint64 (hexadezimal)', kind: 'meta', note: 'ID des Zertifikats, das zur Verifizierung verwendet wird.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Öffentliche Daten, die jeder lesen kann.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Mit AES-GCM verschlüsselte Daten.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Signatur über alle vier vorangehenden Felder.'},
    ]"
/>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">{{t('dat_cms')}} Bereitstellungsanleitung</div>
        <div class="cta-desc">Kubernetes (Multi-Pod) · Docker · Binärdatei (Linux, macOS, Windows) — jetzt sofort einen Ausführungsbefehl generieren</div>
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
