
# DAT (Distributed Access Token)

---

## Latar Belakang Lahirnya DAT

Saat ini banyak sistem mengadopsi JWT, namun di lingkungan operasional nyata terdapat keterbatasan struktural berikut.<br/>
Untuk mengatasi hal tersebut, dirancanglah DAT, sebuah spesifikasi token baru.

#### 🧩 Fragmentasi Spesifikasi Keamanan dan Kurangnya Pemaksaan
JWT menyediakan standar enkripsi seperti JWE, tetapi penggunaannya tidak diwajibkan. <br/>
Akibatnya, banyak lingkungan pengembangan melewatkan enkripsi atau mengirim data dengan cara non-standar sehingga menimbulkan celah keamanan.

#### 🔑 Risiko Keamanan akibat Penggunaan Kunci Statis (Static Key)
Karena rotasi kunci tanda tangan (Key Rolling) tidak diwajibkan, satu kunci kerap dipakai dalam jangka waktu yang sangat panjang. Hal ini dapat berujung pada runtuhnya keamanan seluruh sistem ketika kunci tersebut dicuri, dan insiden pelanggaran akibat hal ini benar-benar pernah terjadi di situs komersial berskala besar.

#### 📉 Penurunan Kinerja akibat Overhead
JWT menjalani proses parsing JSON pada setiap permintaan dan mengonsumsi sumber daya CPU yang cukup besar. Di lingkungan yang menuntut kinerja tinggi, biaya parsing ini dapat menjadi bottleneck bagi keseluruhan sistem.

---

## Filosofi Inti DAT

DAT dirancang di atas prinsip bahwa keamanan harus diwajibkan, bukan dipilih, dan bahwa kinerja tidak dapat dikompromikan.

#### ⚡ Ringan dan Cepat

<WireFormat
    hint="Arahkan kursor ke setiap bidang untuk menampilkan penjelasannya."
    :segments="[
        {name: 'expire', type: 'uint64 (desimal)', kind: 'meta', note: 'Waktu kedaluwarsa. Diwajibkan oleh spesifikasi sehingga tidak dapat dihilangkan.'},
        {name: 'cid', type: 'uint64 (heksadesimal)', kind: 'meta', note: 'ID sertifikat yang digunakan untuk verifikasi.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Data yang terbuka bagi klien.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Data terenkripsi. Tidak dapat dibaca tanpa sertifikat.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Tanda tangan atas empat bidang sebelumnya.'},
    ]"
/>

Seperti terlihat di atas, DAT hanya memiliki lima bidang tetap yang dipisahkan oleh titik (`.`). Karena posisi setiap bidang telah ditetapkan oleh spesifikasi, nilai-nilainya dapat dipotong hanya dengan mencari pemisahnya, tanpa parsing JSON.

#### 🔐 Keamanan yang Dipaksakan

Saat mengirim data, DAT memisahkan secara fisik wilayah teks biasa (Plain) dan **terenkripsi (Secure)**.<br/>
Informasi sensitif wajib dienkripsi, dan seluruh prosesnya dilindungi oleh algoritma standar yang dideklarasikan di dalam sertifikat (ECDSA, AES-GCM, dan sebagainya).

Algoritma enkripsi **ditentukan oleh sertifikat**, bukan oleh token. Karena token tidak membawa informasi algoritma, tidak ada permukaan serangan algorithm confusion seperti yang bersumber dari header `alg` pada JWT.

#### 🔄 Key Rolling yang Dipaksakan

Sertifikat DAT tidak hanya mengatur penerbitan dan kedaluwarsanya token, tetapi juga mengelola langsung **siklus hidup kunci**.<br/>
Di dalam sertifikat tertanam secara spesifikasi keterangan "sejak kapan hingga kapan penerbitan dapat dilakukan", sehingga setelah periode itu lewat, sertifikat tersebut tidak dapat lagi membuat token baru. Situasi di mana satu kunci terpakai bertahun-tahun karena kelalaian administrator secara struktural tidak mungkin terjadi.

#### ⏱️ Pemisahan Jendela Penerbitan dan Masa Berlaku

"Periode selama sertifikat dapat menerbitkan token" dan "periode selama token yang diterbitkan tetap hidup" adalah dua nilai yang berbeda.<br/>
Berkat itu, setelah sertifikat berhenti menerbitkan pun, token yang telanjur keluar masih dapat menghabiskan masa hidupnya, dan selama rentang itu klaster beralih secara mulus ke sertifikat berikutnya.

---

## Perbandingan Mekanisme Autentikasi

| Klasifikasi | **DAT**                       | **JWT** | **Sesi**           |
| --- |-------------------------------| --- |---------------------------|
| **Metode autentikasi** | **Verifikasi terdistribusi**                     | Verifikasi terdistribusi | Terpusat          |
| **Struktur data** | **Raw Bytes<br/>(berbasis offset tetap)** | JSON<br/>(berbasis teks Key-Value) | Serialized Object<br/>(serialisasi objek) |
| **Mekanisme parsing** | **Pemetaan langsung data Byte**            | Perlu parsing JSON dan type casting | Perlu deserialisasi objek dan I/O          |
| **Kinerja pemrosesan** | **Terbaik (overhead parsing minimal)**          | Sedang (bergantung pada kinerja pemrosesan JSON) | Rendah (I/O jaringan/disk)         |
| **Enkripsi** | **Disediakan secara bawaan**                     | Perlu implementasi JWE terpisah (kompleks) | Tidak berlaku                     |
| **Manajemen kunci** | **Rotasi dipaksakan sistem (keamanan diwajibkan)**         | Implementasi sendiri (berisiko akibat kelalaian pengelolaan) | Tidak berlaku                     |
| **Masa berlaku kunci** | **Diwajibkan dan tercantum dalam spesifikasi kunci**              | Opsional (permanen bila tidak dikelola) | Dikelola server pusat                  |
| **Pemilihan algoritma** | **Ditentukan sertifikat (tidak ada di token)**          | Nilai `alg` pada header token | Tidak berlaku                     |
| **Waktu kedaluwarsa** | **Bidang wajib menurut spesifikasi**                 | Klaim opsional (`exp`) | Dikelola server                   |

---

## {{t('bench_title')}} {#performance}

<BenchBars />

---

## Dokumen Selanjutnya

- [{{t('menu_spec_dat')}}](./spec/dat) — format wire token dan aturan kanoniknya
- [{{t('menu_spec_cert')}}](./spec/dat-certificate) — struktur sertifikat, algoritma, siklus hidup
- [{{t('menu_spec_cms')}}](./spec/cms) — penyebaran sertifikat dan perilaku yang perlu diketahui saat operasional

<script setup lang="ts">
import {useTranslate} from "../.vitepress/src/langs";
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import BenchBars from "../.vitepress/ui/BenchBars.vue";
const {t} = useTranslate();
</script>
