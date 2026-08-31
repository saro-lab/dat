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
    {icon: '⏱️', title: 'A expiração faz parte da especificação', desc: 'Todo DAT tem um horário de expiração. Cada aplicação não precisa interpretar separadamente a duração do token.'},
    {icon: '🔏', title: 'Separa as áreas pública e criptografada', desc: 'Coloque em plain os valores necessários para o roteamento e, em secure, aqueles que não podem ficar expostos.'},
    {icon: '🔑', title: 'Seleciona a chave por certificado', desc: 'O cid do token indica o certificado que deve verificá-lo. Os tokens anteriores continuam verificáveis durante a rotação de chaves.'},
    {icon: '🌐', title: 'Os serviços não se consultam diretamente', desc: 'Se cada serviço tiver o mesmo certificado, o servidor emissor e o servidor verificador podem operar separadamente.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT é um token de acesso que vários serviços emitem e verificam segundo a mesma especificação. O token contém o horário de expiração, o ID do certificado,
dados públicos, dados criptografados e uma assinatura. O servidor verificador confere o token com o certificado que possui, sem consultar o servidor emissor a cada vez.
</div>

<div class="hero-desc">
Um certificado reúne o método de assinatura e criptografia do token, as chaves, o período de emissão e o TTL. Com o DAT CMS, os serviços podem sincronizar certificados
completos ou exclusivos para verificação sem distribuí-los manualmente para cada serviço.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Fluxo de uso</div>

<ArchFlow
    :user="{label: 'Usuário', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Criação e armazenamento de certificados', 'Entrega de certificados aos serviços']}"
    :service="{servers: [
        {label: 'Serviço emissor', kind: 'issuer', icon: 'login', request: 'Solicitação de autenticação', response: 'Emissão de DAT', sync: 'Sincronização de certificados aptos a emitir'},
        {label: 'Serviço verificador', kind: 'verifier', icon: 'apps', request: 'Solicitação com DAT', response: 'Resposta após a verificação', sync: 'Sincronização de certificados exclusivos para verificação'},
    ]}"
/>

<div class="hero-desc">
O serviço emissor cria um DAT com o certificado completo, enquanto o serviço verificador o confere com um certificado exclusivo para verificação.
O DAT CMS é opcional; em ambientes que distribuem certificados diretamente, basta usar o gerenciador local do cliente.
</div>

<div class="section-title">Estrutura do DAT</div>

<WireFormat
    hint="Passe o ponteiro sobre cada campo para ver a descrição."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Unix time em que o DAT expira.'},
        {name: 'cid', type: 'uint64 (hexadecimal)', kind: 'meta', note: 'ID do certificado usado na verificação.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Bytes públicos não criptografados.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Bytes protegidos com AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Assinatura que verifica todos os campos anteriores.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">Conheça o DAT</div>
        <div class="cta-desc">Explicação passo a passo dos papéis do token, do certificado e dos serviços emissor e verificador.</div>
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
