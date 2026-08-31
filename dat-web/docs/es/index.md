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
    {icon: '⏱️', title: 'La caducidad forma parte de la especificación', desc: 'Cada DAT tiene una fecha de caducidad. No es necesario interpretar la duración del token por separado en cada aplicación.'},
    {icon: '🔏', title: 'Separa las áreas pública y cifrada', desc: 'Guarda en plain los valores necesarios para el enrutamiento y en secure los que no deben quedar expuestos.'},
    {icon: '🔑', title: 'Selecciona la clave mediante un certificado', desc: 'El cid del token indica el certificado que debe verificarlo. Los tokens anteriores siguen siendo verificables durante una rotación de claves.'},
    {icon: '🌐', title: 'Los servicios no se consultan directamente', desc: 'Si cada servicio dispone del mismo certificado, el servidor emisor y el servidor verificador pueden operar por separado.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT es un token de acceso que varios servicios emiten y verifican conforme a una misma especificación. El token contiene la fecha de caducidad, el ID del certificado,
datos públicos, datos cifrados y una firma. El servidor verificador comprueba el token con su propio certificado sin consultar al servidor emisor en cada ocasión.
</div>

<div class="hero-desc">
Un certificado reúne el método de firma y cifrado del token, las claves, el periodo de emisión y el TTL. Con DAT CMS, los servicios pueden sincronizar certificados
completos o exclusivos para verificación sin tener que distribuirlos manualmente.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Flujo de uso</div>

<ArchFlow
    :user="{label: 'Usuario', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Creación y almacenamiento de certificados', 'Entrega de certificados a los servicios']}"
    :service="{servers: [
        {label: 'Servicio emisor', kind: 'issuer', icon: 'login', request: 'Solicitud de autenticación', response: 'Emisión de DAT', sync: 'Sincronización de certificados aptos para emitir'},
        {label: 'Servicio verificador', kind: 'verifier', icon: 'apps', request: 'Solicitud con DAT', response: 'Respuesta tras la verificación', sync: 'Sincronización de certificados exclusivos para verificación'},
    ]}"
/>

<div class="hero-desc">
El servicio emisor crea un DAT con el certificado completo, mientras que el servicio verificador lo comprueba con un certificado exclusivo para verificación.
DAT CMS es opcional; en entornos que distribuyen los certificados directamente, puede usarse únicamente el gestor local del cliente.
</div>

<div class="section-title">Estructura de DAT</div>

<WireFormat
    hint="Pasa el cursor sobre cada campo para ver su descripción."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Unix time en que caduca el DAT.'},
        {name: 'cid', type: 'uint64 (hexadecimal)', kind: 'meta', note: 'ID del certificado que se usará para verificar.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Bytes públicos sin cifrar.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Bytes protegidos con AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Firma que verifica todos los campos anteriores.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">Conoce DAT</div>
        <div class="cta-desc">Explicación paso a paso de las funciones del token, el certificado y los servicios emisor y verificador.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">Bibliotecas</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
