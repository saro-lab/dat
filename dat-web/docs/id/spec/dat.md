# DAT

DAT adalah string ASCII dengan bidang yang dipisahkan oleh titik (`.`). Setiap bidang muncul satu kali dalam urutan tetap, dan tanda tangan memastikan bahwa bidang sebelumnya dikirim persis seperti aslinya.

<WireFormat
  hint="Urutan bidang dan pemisah merupakan bagian dari spesifikasi."
  :segments="[
    {name: 'expire', type: 'uint64 (desimal)', kind: 'meta', note: 'Unix time kedaluwarsa'},
    {name: 'cid', type: 'uint64 (heksadesimal)', kind: 'meta', note: 'ID sertifikat'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Byte publik'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Byte terenkripsi'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Tanda tangan empat bidang sebelumnya'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## Bidang

| Bidang | Representasi | Arti |
| --- | --- | --- |
| `expire` | Desimal dari bilangan bulat tak bertanda | Unix time saat DAT kedaluwarsa |
| `cid` | Heksadesimal huruf kecil dari bilangan bulat tak bertanda | ID sertifikat untuk verifikasi |
| `plain` | Base64Url tanpa padding | Byte yang tidak dienkripsi |
| `secure` | Base64Url tanpa padding | Byte yang dilindungi dengan algoritme enkripsi sertifikat |
| `signature` | Base64Url tanpa padding | Tanda tangan atas byte ASCII asli `expire.cid.plain.secure` |

`plain` termasuk dalam cakupan tanda tangan sehingga tidak dapat diubah, tetapi dapat didekode oleh siapa pun. Rahasia, data pribadi, dan nilai yang digunakan langsung untuk keputusan otorisasi harus disimpan dalam `secure`. `secure` kosong juga valid.

## Bentuk kanonis

- Seluruh DAT harus berupa ASCII.
- Angka ditulis tanpa tanda, spasi, prefiks, atau nol di depan yang tidak diperlukan. Hanya nilai `0` yang ditulis sebagai `0`.
- Base64Url menggunakan alfabet URL-safe serta tidak mengizinkan padding `=` atau spasi.
- Representasi Base64Url nonkanonis yang menyatakan byte yang sama dengan string berbeda akan ditolak.
- Jika jumlah atau urutan bidang berbeda, string tersebut bukan DAT.

Aturan ini mencegah implementasi berbeda menerima string berbeda sebagai DAT yang sama.

## Penerbitan

1. Pilih sertifikat yang saat ini dapat menerbitkan.
2. Tambahkan TTL sertifikat ke waktu saat ini untuk membuat `expire`.
3. Enkode `plain` sebagai Base64Url.
4. Enkripsi `secure` dengan algoritme enkripsi sertifikat.
5. Tandatangani byte ASCII dari bidang sebelumnya yang digabungkan dengan titik.

Penerbitan hanya dapat dilakukan dalam rentang penerbitan sertifikat: `start <= now <= start + duration`.

## Verifikasi

1. Parse DAT sesuai aturan kanonis.
2. Pastikan `expire > now`. Jika `expire == now`, DAT telah kedaluwarsa.
3. Temukan sertifikat untuk `cid` dan pastikan sertifikat tersebut dapat digunakan untuk verifikasi.
4. Verifikasi tanda tangan byte asli `expire.cid.plain.secure`.
5. Autentikasi dan dekripsi `secure`, lalu kembalikan bersama `plain`.

API parsing yang tidak memverifikasi tanda tangan hanya digunakan untuk pengamatan atau diagnosis. Hasilnya tidak boleh digunakan untuk autentikasi atau memberikan hak akses.

## Tanggung jawab di luar spesifikasi

DAT tidak menetapkan penyimpanan pengguna, metode login, model otorisasi, header pengiriman token, atau daftar pencabutan. Aplikasi menentukan permintaan mana yang diizinkan berdasarkan payload yang sudah diverifikasi.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
