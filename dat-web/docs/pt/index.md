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
    {icon: '⚡', title: 'Protocolo de Quadros Binários', desc: 'Projetado desde o início com campos binários de largura fixa, lidos diretamente por offset de bytes sem uma etapa de análise — emitido e verificado com sobrecarga mínima, sem nenhuma codificação/decodificação JSON.'},
    {icon: '🔐', title: 'Rotação de Chaves Obrigatória', desc: 'Os certificados são rotacionados automaticamente em um cronograma fixo, com o próximo certificado sempre pronto antes que o atual expire — eliminando estruturalmente o incidente típico do JWT em que uma chave permanece inalterada por anos.'},
    {icon: '⏱️', title: 'Separação entre Janela de Emissão e TTL', desc: 'A janela de emissão de um certificado e o período de validade (TTL) de um token são rastreados separadamente, de modo que tokens já emitidos continuam sendo verificados até que seu TTL expire, mesmo depois que o certificado para de emitir novos tokens.'},
    {icon: '🌐', title: 'Clientes Nativos para as Principais Linguagens', desc: 'Clientes oficiais para Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby e C/C++, cada um com uma API idiomática para sua linguagem.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) é um token de autenticação distribuído — todo servidor que emite ou verifica
sessões só precisa concordar com uma única especificação. Construído sobre campos binários de largura fixa, ele lê
e escreve diretamente por offset sem uma etapa de análise, e o próprio protocolo separa a janela de emissão do
TTL, permitindo que a rotação de certificados (key rolling) seja imposta independentemente da linguagem ou
implementação.
</div>

<div class="hero-desc">
O DAT Certificate Management Service (CMS) gera, propaga e expira certificados em todo o cluster de acordo com uma
tarefa cron agendada, para que as chaves possam ser rotacionadas com segurança sem que nenhum token já emitido
falhe na verificação enquanto outros servidores ainda estão se sincronizando com o novo certificado.
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
        <div class="cta-title">Guia de Implantação do {{t('dat_cms')}}</div>
        <div class="cta-desc">Kubernetes (multi-pod) · Docker · binário (Linux, macOS, Windows) — gere um comando de execução agora mesmo</div>
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
