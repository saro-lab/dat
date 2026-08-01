# DAT (Distributed Access Token)

## 1. Ikhtisar

Seiring bertambahnya jumlah pengguna yang terhubung secara bersamaan, jumlah sesi (Session) ikut bertambah sehingga menimbulkan beban berlebih pada server sesi.

**DAT** adalah spesifikasi token yang dirancang untuk mengatasi masalah beban server sesi tersebut sekaligus mewujudkan autentikasi efisien yang tidak berbagi status antar-server (Stateless).

DAT adalah sebuah string yang terdiri atas **5 bidang tetap** yang dipisahkan oleh titik (`.`). Setiap bidang dapat dipotong hanya berdasarkan posisi pemisahnya tanpa parsing JSON, dan waktu kedaluwarsa serta wilayah terenkripsi sudah termasuk di dalam spesifikasinya sendiri.

---

## 2. Format Wire

<WireFormat
    title="Format wire DAT"
    hint="Arahkan kursor ke setiap bidang untuk menampilkan penjelasannya."
    :segments="[
        {name: 'expire', type: 'uint64 (desimal)', kind: 'meta', note: 'Waktu kedaluwarsa token. Bilangan bulat desimal dalam satuan detik Unixtime.'},
        {name: 'cid', type: 'uint64 (heksadesimal)', kind: 'meta', note: 'ID sertifikat yang digunakan untuk verifikasi. Ditulis dalam heksadesimal huruf kecil.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Data yang terbuka bagi klien. Siapa pun dapat mendekodenya.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Data terenkripsi. Berstruktur IV(96bit) + ciphertext AES-GCM, dan berupa string kosong bila tidak berisi apa pun.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Tanda tangan atas keseluruhan empat bidang sebelumnya. Bidang inilah yang mencegah pemalsuan dan perubahan.'},
    ]"
/>

```
expire . cid . plain . secure . signature
```

| Bidang | Tipe | Encoding | Keterangan |
| --- | --- | --- | --- |
| `{{t('dat_expire')}}` | uint64 | String desimal | Unixtime (detik) |
| `CID` | uint64 | String heksadesimal | ID sertifikat |
| `{{t('dat_plain')}}` | Binary | Base64Url (tanpa padding) | Data publik |
| `{{t('dat_secure')}}` | Binary | Base64Url (tanpa padding) | Data terenkripsi |
| `{{t('sig')}}` | Binary | Base64Url (tanpa padding) | Tanda tangan |

<Struct type="dat" />

### 2.1. Spesifikasi Detail Per Bidang

`{{t('dat_expire')}}` : uint64 (Unix Time)
- Menyatakan waktu kedaluwarsa token sebagai bilangan bulat tak bertanda 64-bit dalam satuan detik (Seconds).
- **Hanya angka desimal murni yang diizinkan.** Bila mengandung tanda, spasi, atau pemisah, maka dianggap galat format.

`CID` : Hex (uint64)
- ID sertifikat (Certificate ID) yang digunakan untuk memverifikasi token.
- **Hanya angka heksadesimal murni yang diizinkan**, dan awalan `0x` tidak digunakan.

`{{t('dat_plain')}}` : Base64Url (Binary)
- Menyimpan data yang dipublikasikan kepada klien. Mendukung bukan hanya string, tetapi juga data biner, dan dapat diperiksa dengan mendekodenya di sisi klien.
- **Tidak dienkripsi.** Nilai sensitif tidak boleh dimasukkan ke sini.

`{{t('dat_secure')}}` : Base64Url (Binary)
- Menyimpan data yang dirahasiakan dari klien. Data ini dienkripsi dengan algoritma enkripsi milik sertifikat, sehingga klien yang tidak memiliki sertifikat tidak dapat mendekripsi isinya.
- Struktur internalnya adalah `IV(96bit) + ciphertext`, dan IV dibangkitkan ulang pada setiap proses enkripsi.

`{{t('sig')}}` : Base64Url (Binary)
- Data tanda tangan untuk memverifikasi pemalsuan atau perubahan token. Dibuat dengan menandatangani bidang-bidang sebelumnya menggunakan algoritma tanda tangan milik sertifikat.
- Token yang gagal verifikasi tanda tangan tidak boleh dipercaya pada bidang mana pun.

---

## 3. Aturan Kanonik (Canonical Rules)

Agar klien yang diimplementasikan dalam berbagai bahasa **menafsirkan token yang sama secara identik**, aturan berikut tidak boleh berbeda antar implementasi. Implementasi acuannya adalah Rust (`dat-rust`), dan seluruh implementasi lain disesuaikan dengan aturan ini.

### 3.1. Parsing Bidang Numerik

`expire` dan `cid` ditafsirkan secara **ketat**. Seluruh masukan berikut ditolak sebagai galat format.

| Contoh masukan | Hasil | Alasan |
| --- | --- | --- |
| `100` | Lolos | Desimal murni |
| `007` | Lolos | Nol di depan diizinkan |
| `+100` | Ditolak | Tanda tidak boleh digunakan |
| `-1` | Ditolak | Tanda tidak boleh digunakan |
| `" 100 "` | Ditolak | Spasi tidak diizinkan |
| `1_0` | Ditolak | Pemisah tidak diizinkan |
| `0x10` | Ditolak | Awalan tidak diizinkan |
| `zzzz` | Ditolak | Bukan angka |
| `""` | Ditolak | String kosong |
| `18446744073709551616` | Ditolak | Melebihi rentang uint64 |

::: warning Mengapa harus ketat
Parser yang longgar akan mengubah `-1` menjadi nilai maksimum uint64 sehingga menghasilkan **token yang praktis tidak pernah kedaluwarsa**, atau diam-diam mengubah nilai non-numerik menjadi `0`. Bila tingkat kelonggaran berbeda antar implementasi, token yang sama akan lolos di satu sisi dan ditolak di sisi lain sehingga interoperabilitas rusak.
:::

### 3.2. Penentuan Kedaluwarsa

**Batas kedaluwarsa token DAT dan sertifikat berbeda satu sama lain.** Jangan sampai tertukar.

| Objek | Kondisi valid | Tepat pada saat kedaluwarsa (`expire == now`) |
| --- | --- | --- |
| **Token DAT** | `expire > now` | **Ditolak sebagai kedaluwarsa** |
| **Sertifikat** | `expire >= now` | **Masih valid** |

Token langsung tidak berlaku pada saat waktu kedaluwarsanya tiba, sedangkan sertifikat tetap valid sampai saat tersebut. Sertifikat harus hidup satu tik lebih lama daripada token agar token yang diterbitkan tepat di batas masih dapat diverifikasi.

### 3.3. Payload secure Kosong

Bila tidak ada data yang perlu dienkripsi, `secure` berupa **string kosong**.

- `encrypt(masukan kosong)` → keluaran kosong (tidak ada IV maupun tag GCM yang dilekatkan)
- `decrypt(masukan kosong)` → keluaran kosong
- Bila tidak kosong namun panjangnya kurang dari atau sama dengan panjang IV (12 byte), maka terjadi **galat dekripsi**.

```
1893456000.1a.SGVsbG8..T3RoZXItc2lnbmF0dXJl
                      ↑ token normal dengan posisi secure yang kosong
```

---

## 4. Penerbitan dan Verifikasi

<FlowDiagram
    title="Penerbitan → pengiriman → verifikasi DAT"
    :legend="{req: 'Permintaan', res: 'Respons', sync: 'Sinkronisasi sertifikat'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: 'Server penerbit', kind: 'issuer'},
        {id: 'client', label: 'Klien', kind: 'client'},
        {id: 'verifier', label: 'Server verifikator', kind: 'node'},
    ]"
    :steps="[
        {from: 'cms', to: 'issuer', label: 'Penyebaran sertifikat', kind: 'sync'},
        {from: 'cms', to: 'verifier', label: 'Penyebaran sertifikat', kind: 'sync'},
        {from: 'client', to: 'issuer', label: 'Login', kind: 'req'},
        {from: 'issuer', label: 'issue(plain, secure)', kind: 'note'},
        {from: 'issuer', to: 'client', label: 'Penerbitan DAT', kind: 'res'},
        {from: 'client', to: 'verifier', label: 'Permintaan dengan DAT terlampir', kind: 'req'},
        {from: 'verifier', label: 'Cari sertifikat via CID → verifikasi tanda tangan → dekripsi', kind: 'note'},
        {from: 'verifier', to: 'client', label: 'Respons', kind: 'res'},
    ]"
/>

### 4.1. Prosedur Penerbitan

1. Manajer memilih sertifikat yang **dapat menerbitkan (issuable)** di antara sertifikat yang dimilikinya.
2. Menghitung `expire = now + dat_ttl_seconds`.
3. Meng-encode `plain` ke Base64Url, sedangkan `secure` dienkripsi terlebih dahulu lalu di-encode ke Base64Url.
4. Menandatangani string `expire.cid.plain.secure` dan melekatkannya sebagai bidang terakhir.

### 4.2. Prosedur Verifikasi

1. Membagi menjadi 5 bidang berdasarkan titik (`.`). Bila jumlah bidangnya berbeda, maka galat format.
2. Memeriksa `expire`. Token yang telah kedaluwarsa ditolak sebelum verifikasi tanda tangan.
3. Mencari sertifikat berdasarkan `cid`. Bila tidak ada, verifikasi tidak dapat dilakukan.
4. Memverifikasi tanda tangan atas segmen `expire.cid.plain.secure`.
5. Baru setelah verifikasi berhasil, `secure` didekripsi.

::: danger Jangan percayai nilai sebelum verifikasi tanda tangan
Sebagian implementasi menyediakan API untuk mengeluarkan bidang tanpa memeriksa tanda tangan (kelompok `parse without verify`). Nilai tersebut **sepenuhnya dapat dimanipulasi oleh penyerang**, dan hanya boleh digunakan untuk keperluan logging atau debugging.
:::

---

## 5. Perbandingan dengan JWT

DAT dan JWT (JSON Web Token) berbagi struktur token yang dipisahkan oleh titik (`.`) serta metode verifikasi melalui tanda tangan, namun terdapat perbedaan mendasar berikut dalam desain internalnya.

### 5.1. Perbandingan Perbedaan Struktural

* **Struktur JWT**
  | header | body | signature |
  | --- | --- | --- |
  | Base64Url (JSON String) | Base64Url (JSON String) | Base64Url (Binary) |


* **Struktur DAT**
  | {{t('dat_expire')}} | CID | {{t('dat_plain')}} | {{t('dat_secure')}} | {{t('sig')}} |
  | --- | --- | --- | --- | --- |
  | Unixtime (uint64) | Hex (uint64) | Base64Url (Binary) | Base64Url (Encrypt Binary) | Base64Url (Binary) |


### 5.2. Perbedaan Utama

* **Optimasi ringan berbasis Binary:** JWT menangani Header dan Body dalam bentuk string JSON, sedangkan DAT **menangani data biner (Binary) secara langsung** sehingga mengoptimalkan ukuran data dan meningkatkan efisiensi parsing.
* **Keamanan bawaan (bidang `{{t('dat_secure')}}`):** JWT pada dasarnya mengekspos payload dalam teks biasa, sehingga bila enkripsi diperlukan harus diterapkan spesifikasi terpisah seperti JWE. Sebaliknya, DAT **mendukung fungsi enkripsi pada token itu sendiri melalui bidang `{{t('dat_secure')}}`**.
* **Pemaksaan batasan waktu kedaluwarsa:** Pada JWT bidang `exp` (Claims) bersifat opsional, sedangkan pada DAT **bidang `{{t('dat_expire')}}` diwajibkan dalam struktur token** sehingga verifikasi masa berlaku selalu dilakukan.
* **Tanpa negosiasi algoritma:** JWT membawa sendiri nilai `alg` pada headernya sehingga muncul permukaan serangan algorithm confusion. Pada DAT, algoritma **ditentukan oleh sertifikat** dan token sama sekali tidak memuat informasi algoritma.

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
