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
    {icon: '⏱️', title: 'Срок действия — часть спецификации', desc: 'У каждого DAT есть время истечения. Каждому приложению не приходится отдельно интерпретировать срок жизни токена.'},
    {icon: '🔏', title: 'Открытая и зашифрованная области разделены', desc: 'Значения, нужные для маршрутизации, помещайте в plain, а те, которые нельзя раскрывать, — в secure.'},
    {icon: '🔑', title: 'Сертификаты выбирают ключи', desc: 'Поле cid токена указывает сертификат для проверки. При ротации ключей существующие токены по-прежнему можно проверить.'},
    {icon: '🌐', title: 'Сервисы не опрашивают друг друга', desc: 'Если каждый сервис хранит одинаковые сертификаты, серверы выпуска и проверки могут работать независимо.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT — это access token, который несколько сервисов выпускают и проверяют по одной спецификации. Токен содержит время истечения,
ID сертификата, открытые и зашифрованные данные, а также подпись. Проверяющий сервер использует собственный сертификат, не обращаясь каждый раз к серверу выпуска.
</div>

<div class="hero-desc">
Сертификат объединяет методы подписи и шифрования токена, ключи, период выпуска и TTL. С помощью DAT CMS сервисы могут синхронизировать
полные сертификаты или сертификаты verify-only, не распространяя их самостоятельно.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Как это работает</div>

<ArchFlow
    :user="{label: 'Пользователь', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Создание и хранение сертификатов', 'Распространение сертификатов по сервисам']}"
    :service="{servers: [
        {label: 'Сервис выпуска', kind: 'issuer', icon: 'login', request: 'Запрос аутентификации', response: 'Выпуск DAT', sync: 'Синхронизация сертификатов для выпуска'},
        {label: 'Сервис проверки', kind: 'verifier', icon: 'apps', request: 'Запрос с DAT', response: 'Ответ после проверки', sync: 'Синхронизация сертификатов verify-only'},
    ]}"
/>

<div class="hero-desc">
Сервис выпуска создаёт DAT с полными сертификатами, а сервис проверки проверяет их сертификатами verify-only.
DAT CMS необязателен: в средах с прямым распространением сертификатов достаточно локального менеджера клиента.
</div>

<div class="section-title">Структура DAT</div>

<WireFormat
    hint="Наведите указатель на поле, чтобы увидеть его описание."
    :segments="[
        {name: 'expire', type: 'uint64 (decimal)', kind: 'meta', note: 'Unix-время истечения DAT.'},
        {name: 'cid', type: 'uint64 (hex)', kind: 'meta', note: 'ID сертификата, используемого для проверки.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Открытые незашифрованные bytes.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Bytes, защищённые AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Подпись, проверяющая все предыдущие поля.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">Начните работу с DAT</div>
        <div class="cta-desc">Последовательно изучите роли токенов, сертификатов, сервисов выпуска и проверки.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">Библиотеки</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
