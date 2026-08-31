# Apa itu DAT?

DAT (Distributed Access Token) adalah spesifikasi token akses yang digunakan oleh layanan penerbit dan layanan pemverifikasi dengan berbagi sertifikat yang sama. Karena verifikasi tidak perlu meminta kembali kepada layanan penerbit atau penyimpanan sesi pusat, hasil autentikasi dapat diteruskan sekaligus mengurangi keterikatan antar-layanan.

<WireFormat
  hint="Bidang yang dipisahkan titik membentuk satu DAT."
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: 'Unix time kedaluwarsa'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID sertifikat'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: 'Data publik'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: 'Data terenkripsi'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: 'Tanda tangan isi'},
  ]"
/>

## Komponen

### DAT

String yang dikirim pengguna atau layanan bersama permintaan. DAT memuat waktu kedaluwarsa dan ID sertifikat, serta dapat membawa data publik dan terenkripsi sekaligus.

### Sertifikat

Memuat algoritme, kunci, dan rentang waktu yang diperlukan untuk membuat dan memeriksa DAT. ID sertifikat `cid` tidak berubah; gunakan `cid` baru ketika merotasi kunci.

### Manajer

Manajer pada pustaka klien menyimpan sertifikat, membuat DAT dengan sertifikat yang saat ini dapat menerbitkan, dan memverifikasi DAT dengan sertifikat yang sesuai dengan `cid`-nya.

### DAT CMS

Server opsional yang membuat, menyimpan, dan mengirim sertifikat kepada layanan. Server ini dapat menyediakan sertifikat lengkap bagi layanan penerbit dan sertifikat khusus verifikasi bagi layanan yang hanya melakukan verifikasi.

## Penerbitan dan verifikasi

<ArchFlow
  :user="{label: 'Pengguna', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Pengelolaan sertifikat', 'Sinkronisasi berbasis versi']}"
  :service="{servers: [
    {label: 'Layanan penerbit', kind: 'issuer', icon: 'login', request: 'Informasi autentikasi', response: 'DAT', sync: 'Sertifikat lengkap'},
    {label: 'Layanan pemverifikasi', kind: 'verifier', icon: 'apps', request: 'DAT', response: 'Fungsi terlindungi', sync: 'Sertifikat khusus verifikasi'},
  ]}"
/>

Layanan penerbit menentukan data `plain` dan `secure`, lalu membuat DAT. Layanan pemverifikasi memeriksa waktu kedaluwarsa, tanda tangan, dan ciphertext sebelum meneruskan kedua area data ke aplikasi. `plain` ditandatangani tetapi tidak dienkripsi, sehingga tidak boleh memuat rahasia atau data pribadi.

## Mengapa verifikasi tetap berhasil ketika sertifikat berubah?

Saat sertifikat baru dapat digunakan untuk penerbitan, DAT berikutnya memakai `cid` baru. Sertifikat lama tetap tersedia untuk verifikasi hingga TTL DAT yang telah diterbitkan berakhir. Dengan demikian, rotasi kunci dapat berjalan bersamaan dengan periode verifikasi token lama.

## Lingkungan yang sesuai

- Lingkungan tempat autentikasi dan fungsi sebenarnya ditangani oleh layanan yang berbeda
- Lingkungan tempat beberapa runtime menerbitkan atau memverifikasi token yang sama
- Lingkungan yang meneruskan informasi otorisasi berumur pendek tanpa meminta sesi pusat
- Lingkungan yang perlu memisahkan informasi routing publik dan data terlindungi dalam satu token

DAT tidak menetapkan kebijakan otorisasi itu sendiri. Validnya DAT dan keputusan aplikasi untuk mengizinkan permintaan adalah dua hal yang berbeda.

## Dokumen berikutnya

- [Spesifikasi DAT](./spec/dat): bidang token dan aturan verifikasi
- [Sertifikat](./spec/dat-certificate): kunci dan rentang waktu
- [Spesifikasi DAT CMS](./spec/cms): kontrak sinkronisasi
- [Pustaka](./libs/): menerapkan DAT pada aplikasi

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
