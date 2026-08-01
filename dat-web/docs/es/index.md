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
    {icon: '⚡', title: 'Formato de trama binaria', desc: 'Diseñado con campos binarios de ancho fijo, que se leen directamente por desplazamiento sin ningún paso de análisis. Se emite y se verifica con una sobrecarga mínima, sin codificación ni decodificación JSON.'},
    {icon: '🔐', title: 'Rotación de claves obligatoria', desc: 'Los certificados se sustituyen automáticamente según un ciclo fijo y el siguiente certificado siempre está listo antes de que expire el actual. Esto descarta estructuralmente el incidente operativo típico de JWT en el que una clave permanece igual durante años.'},
    {icon: '⏱️', title: 'Separación entre la ventana de emisión y el TTL', desc: 'La "ventana de emisión" del certificado y el "período de validez de los tokens emitidos" son valores separados, de modo que los tokens ya emitidos siguen verificándose hasta que se agota su TTL, incluso después de que el certificado deje de emitir.'},
    {icon: '🌐', title: 'Clientes nativos para los principales lenguajes', desc: 'Dispone de clientes oficiales para Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby y C/C++, cada uno con una API idiomática de su lenguaje.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) es un token de autenticación distribuido en el que todos los servidores que emiten y
verifican sesiones solo necesitan compartir una única especificación. Está construido sobre campos binarios de ancho
fijo, por lo que se lee y se escribe directamente por desplazamiento sin coste de análisis, y el propio protocolo
separa la ventana de emisión del TTL para que la rotación de certificados (key rolling) pueda imponerse con
independencia del lenguaje o de la implementación.
</div>

<div class="hero-desc">
El DAT Certificate Management Service (CMS) se encarga automáticamente de la creación, la propagación y la expiración
de los certificados de todo el clúster según una planificación programada (Cron), de modo que las claves pueden rotar
de forma segura sin que los tokens ya emitidos fallen la verificación porque varios servidores todavía no hayan
sincronizado por completo el nuevo certificado.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Arquitectura general</div>

<ArchFlow
    :user="{label: 'Usuario', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Crea certificados por periodo de validez', 'Limpia los caducados']}"
    :service="{servers: [
        {label: 'Servidor de inicio de sesión', kind: 'issuer', icon: 'login',
         request: 'Solicitud de inicio de sesión', response: 'Emite un DAT con el certificado', sync: 'Sync de certificados de emisión'},
        {label: 'Servidores de contenido', kind: 'verifier', icon: 'apps',
         request: 'Solicitud de contenido con DAT', response: 'Verifica el DAT y responde', sync: 'Sync de certificados de verificación'},
    ]}"
/>

<div class="hero-desc">
Solo el servidor de inicio de sesión recibe certificados con los que puede emitir; los servidores de contenido
reciben certificados de solo verificación y comprueban con ellos el DAT que llega. El usuario trata con un único
servicio y un servidor de contenido nunca tiene que hablar con el servidor de inicio de sesión.
</div>

<div class="section-title">Estructura del token</div>

<WireFormat
    hint="Pase el cursor sobre cada campo para ver su descripción."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Momento de expiración del token: lo impone la especificación.'},
        {name: 'cid', type: 'uint64 (hexadecimal)', kind: 'meta', note: 'ID del certificado que se usará para la verificación.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Datos públicos que cualquiera puede leer.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Datos cifrados con AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Firma sobre los cuatro campos anteriores.'},
    ]"
/>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">{{t('dat_cms')}} Guía de despliegue</div>
        <div class="cta-desc">Kubernetes (multi-pod) · Docker · binario (Linux, macOS, Windows) — genere ahora mismo el comando de ejecución</div>
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
