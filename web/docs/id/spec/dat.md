# DAT (Data Authentication Token)

## 1. Ikhtisar (Introduction)

Seiring meningkatnya jumlah pengguna yang terhubung secara bersamaan, jumlah sesi (Session) pun ikut bertambah sehingga menimbulkan beban berlebih pada server sesi.

**DAT** adalah spesifikasi token yang dirancang untuk mengatasi masalah beban server sesi tersebut, serta untuk mengimplementasikan autentikasi yang efisien dan tidak bergantung pada status bersama antar-server (Stateless).

---

## 2. Struktur Token (Structure)

<Struct type="dat" />

### 2.1. Spesifikasi Detail Per Bidang

`{{t('dat_expire')}}` : uint64 (Unix Time)
- Menyatakan waktu kedaluwarsa token sebagai bilangan bulat tak bertanda 64-bit dalam satuan detik (Seconds).

`CID` : Hex (uint64)
- ID sertifikat (Certificate ID) yang digunakan untuk memvalidasi token.

`{{t('dat_plain')}}` : Base64Url (Binary)
- Menyimpan data yang akan dipublikasikan kepada klien. Mendukung tidak hanya string, tetapi juga data biner, dan dapat diperiksa dengan melakukan dekoding di sisi klien.

`{{t('dat_secure')}}` : Base64Url (Binary)
- Menyimpan data yang bersifat rahasia dari klien. Data ini dienkripsi menggunakan algoritma enkripsi berbasis sertifikat sehingga klien tidak dapat mendekripsi isinya.

`{{t('sig')}}` : Base64Url (Binary)
- Data tanda tangan untuk memverifikasi pemalsuan atau modifikasi token. Dibuat dengan menandatangani bidang-bidang sebelumnya menggunakan algoritma tanda tangan sertifikat.

---

## 3. Perbandingan dengan JWT

DAT dan JWT (JSON Web Token) berbagi struktur token yang dipisahkan oleh titik (`.`) serta metode verifikasi melalui `signature`, namun terdapat perbedaan mendasar dalam desain internalnya sebagai berikut.

### 3.1. Perbandingan Perbedaan Struktural

* **Struktur JWT**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **Struktur DAT**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |



### 3.2. Perbedaan Utama

* **Optimasi Ringan Berbasis Binary:** JWT menangani Header dan Body dalam bentuk string JSON, sedangkan DAT **menangani data biner (Binary) secara langsung** sehingga mengoptimalkan ukuran data dan meningkatkan efisiensi parsing.
* **Keamanan Bawaan (Bidang `{{t('dat_secure')}} (secure)`):** JWT pada dasarnya mengekspos payload dalam teks biasa, sehingga jika diperlukan enkripsi harus menerapkan spesifikasi terpisah seperti JWE. Sebaliknya, DAT **mendukung fungsi enkripsi secara inheren melalui bidang `{{t('dat_secure')}}`**.
* **Pemaksaan Batasan Waktu Kedaluwarsa:** Pada JWT, bidang `exp` (Claims) bersifat opsional, namun pada DAT, **bidang `{{t('dat_expire')}} (expire)` diwajibkan dalam struktur token** sehingga verifikasi masa berlaku selalu dilakukan.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
