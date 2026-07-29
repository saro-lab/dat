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
    {icon: '⚡', title: 'Бинарный фреймовый протокол', desc: 'Разработан с нуля на основе бинарных полей фиксированной ширины, читаемых напрямую по смещению байтов без этапа разбора — выдача и проверка происходят с минимальными накладными расходами, без какого-либо кодирования/декодирования JSON.'},
    {icon: '🔐', title: 'Обязательная ротация ключей', desc: 'Сертификаты автоматически ротируются по фиксированному расписанию, причём следующий сертификат всегда готов до истечения срока действия текущего — это структурно исключает типичный для JWT инцидент, когда ключ остаётся неизменным годами.'},
    {icon: '⏱️', title: 'Разделение окна выдачи и TTL', desc: 'Окно выдачи сертификата и срок действия токена (TTL) отслеживаются раздельно, поэтому уже выданные токены продолжают проходить проверку до истечения их TTL, даже после того как сертификат перестаёт выдавать новые токены.'},
    {icon: '🌐', title: 'Нативные клиенты для основных языков', desc: 'Официальные клиенты для Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby и C/C++, каждый с идиоматичным API для своего языка.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) — это распределённый токен аутентификации: каждому серверу, выдающему или
проверяющему сессии, достаточно придерживаться единой спецификации. Он построен на бинарных полях фиксированной
ширины, читается и записывается напрямую по смещению без этапа разбора, а сам протокол разделяет окно выдачи и
TTL, что позволяет обеспечивать ротацию сертификатов (ротацию ключей) независимо от языка или реализации.
</div>

<div class="hero-desc">
DAT Certificate Management Service (CMS) генерирует, распространяет и завершает срок действия сертификатов по
всему кластеру согласно запланированному cron-заданию, поэтому ключи можно безопасно ротировать, не допуская сбоя
проверки уже выданных токенов, пока другие серверы ещё синхронизируются с новым сертификатом.
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
        <div class="cta-title">Руководство по развёртыванию {{t('dat_cms')}}</div>
        <div class="cta-desc">Kubernetes (мульти-под) · Docker · бинарный файл (Linux, macOS, Windows) — сгенерируйте команду запуска прямо сейчас</div>
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
