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
    {icon: '⚡', title: 'Formato de Quadro Binário', desc: 'Projetado com campos binários de largura fixa, é lido diretamente por offset, sem nenhuma etapa de análise. Emite e verifica com sobrecarga mínima, sem qualquer codificação/decodificação JSON.'},
    {icon: '🔐', title: 'Rotação de Chaves Obrigatória', desc: 'Os certificados são substituídos automaticamente em um ciclo definido, e o próximo certificado está sempre pronto antes que o atual expire. Isso bloqueia estruturalmente o incidente operacional típico do JWT em que uma chave permanece inalterada por muito tempo.'},
    {icon: '⏱️', title: 'Separação entre Janela de Emissão e TTL', desc: 'A "janela em que o certificado pode emitir" e o "período de validade do token emitido" são separados, de modo que, mesmo depois que o certificado para de emitir, os tokens já emitidos continuam sendo verificados até o fim do seu TTL.'},
    {icon: '🌐', title: 'Clientes Nativos nas Principais Linguagens', desc: 'Estão disponíveis clientes oficiais para Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby e C/C++, cada um oferecido com a API idiomática da sua linguagem.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
O DAT (Distributed Access Token) é um token de autenticação distribuído em que todos os servidores que emitem e verificam
sessões precisam apenas compartilhar uma única especificação. Construído sobre campos binários de largura fixa, ele lê e escreve
diretamente por offset, sem custo de análise, e separa a janela de emissão do TTL no nível do protocolo para que a
substituição de certificados (rotação de chaves) possa ser imposta independentemente da linguagem ou da implementação.
</div>

<div class="hero-desc">
Como o DAT Certificate Management Service (CMS) cuida automaticamente da criação, propagação e expiração dos certificados de
todo o cluster segundo um agendamento pré-definido (Cron), é possível rotacionar as chaves com segurança, sem o incidente em que
tokens emitidos antes de vários servidores terminarem de sincronizar o novo certificado falham na verificação.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Arquitetura Geral</div>

<ArchFlow
    :user="{label: 'Usuário', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Cria certificados por período de validade', 'Remove os expirados']}"
    :service="{servers: [
        {label: 'Servidor de login', kind: 'issuer', icon: 'login',
         request: 'Solicitação de login', response: 'Emite um DAT com o certificado', sync: 'Sync dos certificados de emissão'},
        {label: 'Servidores de conteúdo', kind: 'verifier', icon: 'apps',
         request: 'Requisição de conteúdo com DAT', response: 'Verifica o DAT e atende', sync: 'Sync dos certificados de verificação'},
    ]}"
/>

<div class="hero-desc">
Apenas o servidor de login recebe certificados capazes de emitir; os servidores de conteúdo recebem
certificados somente de verificação e conferem com eles o DAT que chega. O usuário lida com um único serviço,
e um servidor de conteúdo nunca precisa falar com o servidor de login.
</div>

<div class="section-title">Estrutura do Token</div>

<WireFormat
    hint="Passe o mouse sobre cada campo para ver a descrição."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Momento de expiração do token — imposto pela especificação.'},
        {name: 'cid', type: 'uint64 (hexadecimal)', kind: 'meta', note: 'ID do certificado a ser usado na verificação.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Dados públicos que qualquer um pode ler.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Dados criptografados com AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Assinatura sobre os quatro campos anteriores por inteiro.'},
    ]"
/>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">Guia de Implantação do {{t('dat_cms')}}</div>
        <div class="cta-desc">Kubernetes (multi-pod) · Docker · binário (Linux, macOS, Windows) — gere o comando de execução agora mesmo</div>
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
