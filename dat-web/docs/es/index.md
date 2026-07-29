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
    {icon: '⚡', title: 'Protocolo de tramas binarias', desc: 'Diseñado desde cero con campos binarios de ancho fijo, leídos directamente por desplazamiento de bytes sin un paso de análisis: se emite y verifica con una sobrecarga mínima, sin codificación/decodificación JSON.'},
    {icon: '🔐', title: 'Rotación de claves obligatoria', desc: 'Los certificados rotan automáticamente según un calendario fijo, con el siguiente certificado siempre listo antes de que expire el actual, lo que descarta estructuralmente el incidente típico de JWT en el que una clave permanece igual durante años.'},
    {icon: '⏱️', title: 'Separación entre ventana de emisión y TTL', desc: 'La ventana de emisión de un certificado y el período de validez (TTL) de un token se rastrean por separado, de modo que los tokens ya emitidos siguen verificándose hasta que expira su TTL, incluso después de que el certificado deja de emitir nuevos tokens.'},
    {icon: '🌐', title: 'Clientes nativos para los principales lenguajes', desc: 'Clientes oficiales para Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby y C/C++, cada uno con una API idiomática para su lenguaje.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) es un token de autenticación distribuido: todos los servidores que emiten o
verifican sesiones solo necesitan coincidir en una única especificación. Está construido sobre campos binarios de
ancho fijo, lee y escribe directamente por desplazamiento sin un paso de análisis, y el propio protocolo separa la
ventana de emisión del TTL para que la rotación de certificados (key rolling) pueda imponerse independientemente
del lenguaje o la implementación.
</div>

<div class="hero-desc">
El DAT Certificate Management Service (CMS) genera, propaga y expira certificados en todo el clúster según una
tarea cron programada, de modo que las claves puedan rotar de forma segura sin que ningún token ya emitido falle
nunca la verificación mientras otros servidores aún se sincronizan con el nuevo certificado.
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
        <div class="cta-title">{{t('dat_cms')}} Guía de despliegue</div>
        <div class="cta-desc">Kubernetes (multi-pod) · Docker · binario (Linux, macOS, Windows) — genera un comando de ejecución ahora mismo</div>
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
