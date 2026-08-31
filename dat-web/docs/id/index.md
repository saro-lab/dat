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
    {icon: '⏱️', title: 'Kedaluwarsa menjadi bagian spesifikasi', desc: 'Setiap DAT memiliki waktu kedaluwarsa. Masa berlaku token tidak perlu ditafsirkan secara terpisah oleh setiap aplikasi.'},
    {icon: '🔏', title: 'Memisahkan area publik dan terenkripsi', desc: 'Simpan nilai yang diperlukan untuk routing di plain, dan nilai yang tidak boleh terekspos di secure.'},
    {icon: '🔑', title: 'Memilih kunci melalui sertifikat', desc: 'cid pada token menunjuk sertifikat yang harus memverifikasinya. Token lama tetap dapat diverifikasi selama rotasi kunci.'},
    {icon: '🌐', title: 'Layanan tidak saling meminta informasi langsung', desc: 'Jika setiap layanan memiliki sertifikat yang sama, server penerbit dan server pemverifikasi dapat dioperasikan secara terpisah.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT adalah token akses yang diterbitkan dan diverifikasi oleh beberapa layanan berdasarkan spesifikasi yang sama. Token memuat waktu kedaluwarsa, ID sertifikat,
data publik, data terenkripsi, dan tanda tangan. Server pemverifikasi memeriksa token dengan sertifikat yang dimilikinya tanpa harus selalu bertanya kepada server penerbit.
</div>

<div class="hero-desc">
Sertifikat menggabungkan metode penandatanganan dan enkripsi token, kunci, periode penerbitan, serta TTL. Dengan DAT CMS, layanan dapat menyinkronkan sertifikat lengkap
atau sertifikat khusus verifikasi tanpa membagikan sertifikat secara manual ke setiap layanan.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Alur penggunaan</div>

<ArchFlow
    :user="{label: 'Pengguna', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Membuat dan menyimpan sertifikat', 'Mengirim sertifikat ke layanan']}"
    :service="{servers: [
        {label: 'Layanan penerbit', kind: 'issuer', icon: 'login', request: 'Permintaan autentikasi', response: 'Penerbitan DAT', sync: 'Sinkronisasi sertifikat yang dapat menerbitkan'},
        {label: 'Layanan pemverifikasi', kind: 'verifier', icon: 'apps', request: 'Permintaan dengan DAT', response: 'Respons setelah verifikasi', sync: 'Sinkronisasi sertifikat khusus verifikasi'},
    ]}"
/>

<div class="hero-desc">
Layanan penerbit membuat DAT dengan sertifikat lengkap, sedangkan layanan pemverifikasi memeriksanya dengan sertifikat khusus verifikasi.
DAT CMS bersifat opsional; lingkungan yang membagikan sertifikat secara langsung dapat hanya menggunakan manajer lokal pada klien.
</div>

<div class="section-title">Struktur DAT</div>

<WireFormat
    hint="Arahkan penunjuk ke setiap bidang untuk melihat keterangannya."
    :segments="[
        {name: 'expire', type: 'uint64 (desimal)', kind: 'meta', note: 'Unix time saat DAT kedaluwarsa.'},
        {name: 'cid', type: 'uint64 (heksadesimal)', kind: 'meta', note: 'ID sertifikat yang digunakan untuk verifikasi.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Byte publik yang tidak dienkripsi.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Byte yang dilindungi dengan AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Tanda tangan yang memverifikasi seluruh bidang sebelumnya.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">Mengenal DAT</div>
        <div class="cta-desc">Penjelasan berurutan tentang peran token, sertifikat, layanan penerbit, dan layanan pemverifikasi.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">Pustaka</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
