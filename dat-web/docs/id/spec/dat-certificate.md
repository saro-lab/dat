# Sertifikat

Sertifikat DAT menyatakan rentang waktu, algoritme, dan kunci yang diperlukan untuk menerbitkan serta memverifikasi token dalam satu string.

<WireFormat
  hint="Sertifikat juga terdiri dari bidang ASCII yang dipisahkan titik dalam urutan tetap."
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID sertifikat yang tidak berubah'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'Waktu mulai penerbitan'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'Periode dapat menerbitkan'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'Masa berlaku DAT'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'Algoritme tanda tangan'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Algoritme enkripsi'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Kunci penandatanganan atau verifikasi'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Kunci enkripsi'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## Rentang waktu

<CertTimeline />

- Sertifikat dapat menerbitkan DAT dari `start` hingga `start + duration`, termasuk kedua waktu batas tersebut.
- DAT yang diterbitkan berlaku selama `ttl` sejak waktu penerbitannya.
- Sertifikat diperlukan untuk verifikasi hingga `start + duration + ttl`. Sertifikat juga dapat memverifikasi tepat pada waktu tersebut.

Jika sertifikat langsung dihapus ketika periode penerbitan berakhir, DAT yang sudah diterbitkan tidak dapat diverifikasi. Manajer dan CMS menangani kemampuan penerbitan dan kemampuan verifikasi secara terpisah.

## ID sertifikat dan rotasi kunci

`cid` adalah kontrak publik yang mengidentifikasi kunci dan rentang waktu. Jangan menimpa `cid` yang sudah ada dengan kunci lain. Untuk merotasi kunci, buat sertifikat baru dan gunakan `cid` baru. Layanan menyinkronkan sertifikat baru lebih awal, lalu menghapus sertifikat lama setelah semua DAT yang diterbitkan dengannya kedaluwarsa.

## Algoritme tanda tangan

| Nama | Kegunaan | Sertifikat khusus verifikasi |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | Tidak didukung |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | Tidak didukung |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | Tidak didukung |
| `ECDSA-P256` | ECDSA P-256 | Didukung |
| `ECDSA-P384` | ECDSA P-384 | Didukung |
| `ECDSA-P521` | ECDSA P-521 | Didukung |

HMAC menggunakan kunci yang sama untuk menandatangani dan memverifikasi. Karena itu, memberikan kunci kepada server pemverifikasi juga memungkinkannya menerbitkan. Pada lingkungan yang harus memisahkan kewenangan penerbitan, gunakan ECDSA dan sertifikat khusus verifikasi.

## Algoritme enkripsi

| Nama | Kunci |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Nama algoritme merupakan bagian dari kontrak wire. Jangan menggantinya dengan alias yang digunakan dalam JWT.

## Sertifikat lengkap dan sertifikat khusus verifikasi

Sertifikat ECDSA lengkap memuat kunci privat yang diperlukan untuk menandatangani. Sertifikat khusus verifikasi hanya menyimpan kunci publik ECDSA, tetapi tetap menyimpan kunci AES yang diperlukan untuk mendekripsi `secure`. Karena itu, layanan khusus verifikasi dapat memeriksa dan mendekripsi DAT, tetapi tidak dapat menerbitkan DAT baru.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
