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
    {icon: '⚡', title: 'Protokol Bingkai Biner', desc: 'Dirancang dari awal dengan bidang biner berlebar tetap, dibaca langsung dari offset byte tanpa proses parsing — diterbitkan dan diverifikasi dengan overhead minimal, tanpa encoding/decoding JSON.'},
    {icon: '🔐', title: 'Rotasi Kunci Wajib', desc: 'Sertifikat berotasi otomatis sesuai jadwal tetap, dengan sertifikat berikutnya selalu siap sebelum yang saat ini kedaluwarsa — secara struktural menghilangkan insiden khas JWT di mana sebuah kunci tetap sama selama bertahun-tahun.'},
    {icon: '⏱️', title: 'Pemisahan Jendela Penerbitan dan TTL', desc: 'Jendela penerbitan sertifikat dan masa berlaku token (TTL) dilacak secara terpisah, sehingga token yang sudah diterbitkan tetap terverifikasi hingga TTL-nya habis, bahkan setelah sertifikat berhenti menerbitkan token baru.'},
    {icon: '🌐', title: 'Klien Native untuk Bahasa Utama', desc: 'Klien resmi untuk Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby, dan C/C++, masing-masing dengan API yang idiomatik untuk bahasanya.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) adalah token autentikasi terdistribusi — setiap server yang menerbitkan atau
memverifikasi sesi hanya perlu menyepakati satu spesifikasi yang sama. Dibangun di atas bidang biner berlebar
tetap, DAT membaca dan menulis langsung berdasarkan offset tanpa proses parsing, dan protokolnya sendiri
memisahkan jendela penerbitan dari TTL sehingga rotasi sertifikat (key rolling) dapat dipaksakan secara independen
dari bahasa atau implementasi.
</div>

<div class="hero-desc">
DAT Certificate Management Service (CMS) menghasilkan, menyebarkan, dan mengakhiri masa berlaku sertifikat di
seluruh klaster sesuai jadwal cron, sehingga kunci dapat dirotasi dengan aman tanpa ada token yang sudah
diterbitkan gagal diverifikasi selama server lain masih menyusul sertifikat baru.
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
        <div class="cta-title">Panduan Deployment {{t('dat_cms')}}</div>
        <div class="cta-desc">Kubernetes (multi-pod) · Docker · biner (Linux, macOS, Windows) — buat perintah jalankan sekarang juga</div>
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
