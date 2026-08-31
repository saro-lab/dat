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
    {icon: '⏱️', title: 'La scadenza fa parte della specifica', desc: 'Ogni DAT ha una data di scadenza. La durata del token non viene reinterpretata da ogni applicazione.'},
    {icon: '🔏', title: 'Dati pubblici e cifrati sono separati', desc: 'I valori necessari all’instradamento vanno in plain; quelli che non devono essere esposti vanno in secure.'},
    {icon: '🔑', title: 'Il certificato seleziona le chiavi', desc: 'Il cid del token indica il certificato di verifica. I token esistenti restano verificabili durante la rotazione delle chiavi.'},
    {icon: '🌐', title: 'I servizi non si interrogano direttamente', desc: 'Se ogni servizio possiede gli stessi certificati, emissione e verifica possono essere gestite separatamente.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT è un token di accesso che più servizi emettono e verificano secondo la stessa specifica. Contiene data di scadenza, ID del certificato,
dati pubblici, dati cifrati e firma. Il servizio di verifica controlla il token con i certificati che possiede, senza interrogare ogni volta il servizio emittente.
</div>

<div class="hero-desc">
Un certificato riunisce algoritmi e chiavi di firma e cifratura, periodo di emissione e TTL. Con DAT CMS ogni servizio può sincronizzare
certificati completi o di sola verifica senza distribuirli manualmente.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Flusso di utilizzo</div>

<ArchFlow
    :user="{label: 'Utente', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Generazione e conservazione dei certificati', 'Distribuzione dei certificati ai servizi']}"
    :service="{servers: [
        {label: 'Servizio emittente', kind: 'issuer', icon: 'login', request: 'Richiesta di autenticazione', response: 'Emissione DAT', sync: 'Sincronizzazione dei certificati emittenti'},
        {label: 'Servizio di verifica', kind: 'verifier', icon: 'apps', request: 'Richiesta con DAT', response: 'Risposta dopo la verifica', sync: 'Sincronizzazione dei certificati di sola verifica'},
    ]}"
/>

<div class="hero-desc">
Il servizio emittente crea DAT con certificati completi; quello di verifica li controlla con certificati di sola verifica.
DAT CMS è facoltativo: negli ambienti che distribuiscono direttamente i certificati è sufficiente il gestore locale della libreria client.
</div>

<div class="section-title">Struttura DAT</div>

<WireFormat
    hint="Passa il puntatore su un campo per visualizzarne la descrizione."
    :segments="[
        {name: 'expire', type: 'uint64 (decimale)', kind: 'meta', note: 'Data Unix di scadenza del DAT.'},
        {name: 'cid', type: 'uint64 (esadecimale)', kind: 'meta', note: 'ID del certificato usato per la verifica.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Byte pubblici non cifrati.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Byte protetti con AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Firma che verifica tutti i campi precedenti.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">Scopri DAT</div>
        <div class="cta-desc">Una spiegazione ordinata dei ruoli di token, certificati, servizio emittente e servizio di verifica.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">Librerie</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
