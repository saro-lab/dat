# Kode kesalahan

Implementasi DAT menyediakan kode kesalahan yang stabil selain pesan yang dapat dibaca manusia. Program harus menentukan perilaku berdasarkan kode dan klasifikasi percobaan ulang tanpa membandingkan string pesan.

## Cara membacanya

```text
DAT_<area>_<penyebab>
```

| Prefiks | Area |
| --- | --- |
| `DAT_TOKEN_` | String DAT dan kedaluwarsa |
| `DAT_CERT_` | String dan keadaan sertifikat |
| `DAT_SIG_` | Tanda tangan dan verifikasi |
| `DAT_CRYPTO_` | Enkripsi dan dekripsi |
| `DAT_KEY_` | Format dan izin kunci |
| `DAT_MANAGER_` | Manajer sertifikat |
| `DAT_CONFIG_` | Argumen pemanggilan dan konfigurasi |
| `DAT_INTERNAL_` | Fungsi internal runtime |
| `DAT_CMS_` | Sinkronisasi klien CMS |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | Server CMS |

`_UNKNOWN` hanya digunakan untuk kesalahan yang tidak dapat diklasifikasikan dengan kode lain dalam area tersebut. Penyebab yang sama menggunakan nama yang sama meskipun areanya berbeda.

## Klasifikasi percobaan ulang

| Klasifikasi | Arti | Penanganan |
| --- | --- | --- |
| Sementara | Dapat berhasil setelah keadaan eksternal pulih | Coba lagi secara terbatas setelah backoff |
| Keadaan | Dapat berhasil setelah sinkronisasi sertifikat atau waktu berubah | Perbarui keadaan yang diperlukan lalu coba lagi |
| Permanen | Percobaan ulang dengan input yang sama tetap gagal | Perbaiki input, konfigurasi, atau kode |

## Token dan sertifikat

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
Jumlah bidang, angka, atau representasi Base64Url pada DAT tidak sesuai spesifikasi. Buang input tersebut.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
Waktu kedaluwarsa DAT sama dengan atau lebih awal dari waktu saat ini. DAT baru diperlukan.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
Struktur string sertifikat atau representasi bidangnya tidak benar.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
Tidak ada sertifikat yang sesuai dengan `cid` DAT. Periksa keadaan sinkronisasi sertifikat.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
Sertifikat yang diperlukan mungkin belum sampai ke layanan. Lakukan sinkronisasi segera lalu nilai kembali.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
Waktu mulai sertifikat belum tiba. Periksa waktu sistem dan waktu distribusi sertifikat.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
Periode sertifikat dapat digunakan untuk verifikasi telah berakhir.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
`cid` yang sama muncul berulang dalam satu daftar impor. Seluruh impor ditolak.
</ErrorCode>

## Tanda tangan, enkripsi, dan kunci

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
Tanda tangan tidak sesuai dengan isi. DAT mungkin telah diubah atau ditandatangani dengan kunci lain.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
Tag autentikasi AES-GCM tidak cocok. Periksa kemungkinan perubahan ciphertext atau ketidakcocokan sertifikat.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
Panjang, format, atau kombinasi algoritme kunci tidak valid.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Ada upaya menerbitkan DAT dengan sertifikat khusus verifikasi. Layanan penerbit memerlukan sertifikat lengkap.
</ErrorCode>

`DAT_SIG_MISMATCH` dan `DAT_CRYPTO_TAG_MISMATCH` merupakan kesalahan yang diklasifikasikan benar oleh API peristiwa keamanan publik. Satu input tidak valid bukan berarti layanan gagal, tetapi kejadian berulang harus diamati sebagai kemungkinan peristiwa keamanan.

## Manajer dan konfigurasi

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
Manajer tidak memiliki sertifikat. Impor sertifikat atau selesaikan sinkronisasi CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Sertifikat tersedia, tetapi tidak ada sertifikat lengkap yang saat ini dapat menerbitkan. Periksa kedaluwarsa, waktu mulai, atau keadaan verify-only pada rantai penyebab.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Argumen pemanggilan atau nilai konfigurasi berada di luar rentang yang diizinkan.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
Fungsi kriptografi atau jaringan yang diperlukan tidak tersedia pada platform ini.
</ErrorCode>

## Klien CMS

| Kode | Arti | Penanganan umum |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | Format URI CMS tidak valid | Perbaiki konfigurasi |
| `DAT_CMS_UNAUTHORIZED` | Autentikasi gagal | Perbaiki token |
| `DAT_CMS_FORBIDDEN` | Peran tidak memiliki izin | Periksa peran token |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | Path tidak ada atau berbeda | Periksa alamat dan path CMS |
| `DAT_CMS_NETWORK` | Koneksi atau transfer gagal | Periksa jaringan lalu lakukan backoff |
| `DAT_CMS_TIMEOUT` | Timeout | Sesuaikan jaringan dan timeout |
| `DAT_CMS_SERVER_ERROR` | Kesalahan server CMS | Periksa keadaan server lalu lakukan backoff |
| `DAT_CMS_RESPONSE_INVALID` | Format respons berhasil tidak valid | Periksa kontrak server dan klien |
| `DAT_CMS_VERSION_RESET` | Versi server bergerak mundur | Periksa data CMS dan keadaan deployment |
| `DAT_CMS_IMPORT_FAILED` | Gagal menerapkan sertifikat yang diterima | Periksa rantai penyebab |
| `DAT_CMS_STOPPED` | Menggunakan manajer yang sudah berhenti | Buat manajer baru atau perbaiki urutan pemanggilan |

Pustaka dengan sinkronisasi awal best-effort menyimpan kesalahan dalam bidang kesalahan terakhir. Jika startup harus gagal, gunakan API sinkronisasi langsung yang mengembalikan atau melempar kesalahan secara langsung.

## Server CMS

| Kode | HTTP | Arti |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | Token tidak ada atau tidak valid |
| `DAT_AUTH_FORBIDDEN` | 403 | Peran token tidak sesuai dengan izin permintaan |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Nama algoritme tidak didukung |
| `DAT_REQ_NOT_FOUND` | 404·405 | Path atau metode tidak cocok |
| `DAT_REQ_TOO_LARGE` | 413 | Kode yang dicadangkan untuk batas isi permintaan terlampaui |
| `DAT_STORE_UNAVAILABLE` | 503 | Penyimpanan tidak tersedia sementara |
| `DAT_STORE_UNKNOWN` | 500 | Kesalahan yang tidak terklasifikasi saat memproses penyimpanan |

Saat ini klien tidak menampilkan kode server dalam JSON non-2xx apa adanya, tetapi mengubah status HTTP menjadi kode `DAT_CMS_*`. Karena itu, kode pada log server dan kode kesalahan klien dapat berbeda.

## Cara memeriksa menurut bahasa

| Lingkungan | Kode kesalahan | Klasifikasi percobaan ulang |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Kesalahan yang memiliki penyebab di bawahnya dapat diperiksa melalui rantai pengecualian atau API untuk mengambil penyebab pada setiap bahasa.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
