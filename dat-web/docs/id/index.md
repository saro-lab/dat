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
    {icon: '⚡', title: 'Format Bingkai Biner', desc: 'Dirancang dengan bidang biner berlebar tetap sehingga dibaca langsung dari offset tanpa proses parsing. Diterbitkan dan diverifikasi dengan overhead seminimal mungkin, tanpa encoding/decoding JSON.'},
    {icon: '🔐', title: 'Rotasi Kunci yang Diwajibkan', desc: 'Sertifikat berotasi otomatis sesuai siklus yang telah ditetapkan, dan sertifikat berikutnya selalu siap sebelum yang berjalan kedaluwarsa. Insiden operasional khas JWT, di mana sebuah kunci dibiarkan sama dalam waktu lama, dicegah secara struktural.'},
    {icon: '⏱️', title: 'Pemisahan Jendela Penerbitan dan TTL', desc: '"Jendela penerbitan" sertifikat dan "masa berlaku token yang diterbitkan" dipisahkan, sehingga token yang telanjur keluar tetap diverifikasi hingga TTL-nya habis, bahkan setelah sertifikat berhenti menerbitkan.'},
    {icon: '🌐', title: 'Klien Native untuk Bahasa Utama', desc: 'Tersedia klien resmi dengan API yang idiomatik untuk masing-masing bahasa: Rust, Java/Kotlin, JavaScript/TypeScript, Python, Go, C#, Ruby, C/C++, dan lainnya.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">{{t('description')}}</div>

<div class="hero-desc">
DAT (Distributed Access Token) adalah token autentikasi terdistribusi di mana setiap server yang menerbitkan dan
memverifikasi sesi cukup berbagi satu spesifikasi yang sama. Dirancang di atas bidang biner berlebar tetap, DAT
membaca dan menulis langsung berdasarkan offset tanpa biaya parsing, dan memisahkan jendela penerbitan dari TTL
pada tingkat protokol agar rotasi sertifikat (key rolling) dapat dipaksakan tanpa bergantung pada bahasa maupun
implementasi.
</div>

<div class="hero-desc">
DAT Certificate Management Service (CMS) menangani pembuatan, penyebaran, dan pengakhiran masa berlaku sertifikat
untuk seluruh klaster secara otomatis sesuai jadwal yang ditetapkan (Cron), sehingga kunci dapat dirotasi dengan
aman tanpa insiden token gagal diverifikasi karena diterbitkan sebelum semua server selesai menyinkronkan
sertifikat baru.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Arsitektur Menyeluruh</div>

<ArchFlow
    :user="{label: 'Pengguna', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Membuat sertifikat per masa berlaku', 'Membersihkan yang kedaluwarsa']}"
    :service="{servers: [
        {label: 'Server login', kind: 'issuer', icon: 'login',
         request: 'Permintaan login', response: 'Menerbitkan DAT dengan sertifikat', sync: 'Sinkronisasi sertifikat penerbitan'},
        {label: 'Server konten', kind: 'verifier', icon: 'apps',
         request: 'Permintaan konten dengan DAT', response: 'Memverifikasi DAT lalu melayani', sync: 'Sinkronisasi sertifikat verifikasi'},
    ]}"
/>

<div class="hero-desc">
Hanya server login yang menerima sertifikat yang bisa dipakai menerbitkan; server konten hanya menerima
sertifikat khusus verifikasi dan memakainya untuk memeriksa DAT yang masuk. Pengguna cukup berhadapan dengan
satu layanan, dan server konten tidak pernah perlu berbicara dengan server login.
</div>

<div class="section-title">Struktur Token</div>

<WireFormat
    hint="Arahkan kursor ke setiap bidang untuk menampilkan penjelasannya."
    :segments="[
        {name: 'expire', type: 'uint64 (desimal)', kind: 'meta', note: 'Waktu kedaluwarsa token — diwajibkan oleh spesifikasi.'},
        {name: 'cid', type: 'uint64 (heksadesimal)', kind: 'meta', note: 'ID sertifikat yang digunakan untuk verifikasi.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Data publik yang dapat dibaca siapa pun.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Data yang dienkripsi dengan AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Tanda tangan atas keseluruhan empat bidang sebelumnya.'},
    ]"
/>

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

</div>

<DatExample />
