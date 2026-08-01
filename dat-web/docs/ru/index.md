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
    {icon: '⚡', title: 'Бинарный формат кадра', desc: 'Формат построен на бинарных полях фиксированной ширины и читается напрямую по смещению, без этапа разбора. Выдача и проверка выполняются с минимальными накладными расходами, без кодирования и декодирования JSON.'},
    {icon: '🔐', title: 'Обязательная ротация ключей', desc: 'Сертификаты автоматически заменяются по заданному циклу, и следующий сертификат всегда готов до истечения текущего. Это структурно исключает типичный для JWT эксплуатационный инцидент, когда один ключ годами остаётся неизменным.'},
    {icon: '⏱️', title: 'Разделение окна выдачи и TTL', desc: '«Период, в течение которого сертификат может выдавать токены» и «срок действия выданного токена» разделены, поэтому уже выданные токены продолжают проходить проверку до конца своего TTL даже после того, как сертификат перестал выдавать новые.'},
    {icon: '🌐', title: 'Нативные клиенты для основных языков', desc: 'Доступны официальные клиенты для Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby, C/C++ — каждый с идиоматичным для своего языка API.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) — это распределённый токен аутентификации: всем серверам, которые выдают и проверяют
сессии, достаточно разделять одну общую спецификацию. Он построен на бинарных полях фиксированной ширины, читается и
записывается напрямую по смещению без затрат на разбор, а окно выдачи и TTL разделены на уровне самого протокола —
чтобы замену сертификатов (ротацию ключей) можно было обеспечивать независимо от языка и реализации.
</div>

<div class="hero-desc">
DAT Certificate Management Service (CMS) автоматически создаёт, распространяет и завершает сертификаты по всему
кластеру согласно заданному расписанию (Cron), поэтому ключи можно безопасно ротировать без инцидентов, когда
токен, выданный до полной синхронизации нового сертификата на всех серверах, не проходит проверку.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Общая архитектура</div>

<ArchFlow
    :user="{label: 'Пользователь', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Создаёт сертификаты по срокам', 'Убирает просроченные']}"
    :service="{servers: [
        {label: 'Сервер входа', kind: 'issuer', icon: 'login',
         request: 'Запрос на вход', response: 'Выдаёт DAT по сертификату', sync: 'Синхронизация сертификатов выдачи'},
        {label: 'Серверы контента', kind: 'verifier', icon: 'apps',
         request: 'Запрос контента с DAT', response: 'Проверяет DAT и отвечает', sync: 'Синхронизация сертификатов проверки'},
    ]}"
/>

<div class="hero-desc">
Сертификаты, которыми можно выдавать, получает только сервер входа; серверы контента получают сертификаты
лишь для проверки и сверяют по ним пришедший DAT. Пользователь имеет дело с одним сервисом, а серверу контента
никогда не нужно обращаться к серверу входа.
</div>

<div class="section-title">Структура токена</div>

<WireFormat
    hint="Наведите курсор на поле, чтобы увидеть описание."
    :segments="[
        {name: 'expire', type: 'uint64 (дес.)', kind: 'meta', note: 'Время истечения токена — закреплено спецификацией.'},
        {name: 'cid', type: 'uint64 (шестн.)', kind: 'meta', note: 'ID сертификата, используемого при проверке.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Открытые данные, доступные для чтения кому угодно.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Данные, зашифрованные с помощью AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Подпись всех четырёх предшествующих полей.'},
    ]"
/>

<a :href="`${root}/svc/docker-saro-lab-dat-cms`" class="cta-banner">
    <div class="cta-icon">🚀</div>
    <div class="cta-text">
        <div class="cta-title">Руководство по развёртыванию {{t('dat_cms')}}</div>
        <div class="cta-desc">Kubernetes (несколько подов) · Docker · бинарный файл (Linux, macOS, Windows) — сгенерируйте команду запуска прямо сейчас</div>
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
