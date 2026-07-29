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
    {icon: '⚡', title: 'Binäres Frame-Protokoll', desc: 'Von Grund auf mit binären Feldern fester Breite entworfen, direkt per Byte-Offset gelesen, ohne Parsing-Durchlauf — Ausstellung und Verifizierung mit minimalem Overhead, ganz ohne JSON-Kodierung/-Dekodierung.'},
    {icon: '🔐', title: 'Obligatorisches Key-Rolling', desc: 'Zertifikate rotieren automatisch nach einem festen Zeitplan, das nächste Zertifikat steht immer bereit, bevor das aktuelle abläuft — schließt strukturell den JWT-typischen Vorfall aus, bei dem ein Schlüssel jahrelang unverändert bleibt.'},
    {icon: '⏱️', title: 'Trennung von Ausstellungsfenster und TTL', desc: 'Das Ausstellungsfenster eines Zertifikats und die Gültigkeitsdauer (TTL) eines Tokens werden getrennt verfolgt, sodass bereits ausgestellte Tokens weiterhin verifiziert werden, bis ihre TTL abläuft — selbst nachdem das Zertifikat keine neuen Tokens mehr ausstellt.'},
    {icon: '🌐', title: 'Native Clients für gängige Sprachen', desc: 'Offizielle Clients für Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby und C/C++, jeweils mit einer für die Sprache idiomatischen API.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) ist ein verteiltes Authentifizierungstoken — jeder Server, der Sitzungen ausstellt
oder verifiziert, muss sich nur auf eine einzige Spezifikation einigen. Es basiert auf binären Feldern fester
Breite, liest und schreibt direkt per Offset ohne Parsing-Durchlauf, und das Protokoll selbst trennt
Ausstellungsfenster von der TTL, sodass die Zertifikatsrotation (Key-Rolling) unabhängig von Sprache oder
Implementierung erzwungen werden kann.
</div>

<div class="hero-desc">
Der DAT Certificate Management Service (CMS) erzeugt, verteilt und lässt Zertifikate im gesamten Cluster nach
einem geplanten Cron-Job ablaufen, sodass Schlüssel sicher rotiert werden können, ohne dass bereits ausgestellte
Tokens jemals die Verifizierung verlieren, während andere Server das neue Zertifikat noch nachziehen.
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

<div class="section-title">{{t('example')}}</div>

</div>

<DatExample />
