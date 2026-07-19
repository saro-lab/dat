# Sertifikat DAT

## 1. Ikhtisar (Introduction)

**Sertifikat DAT** adalah spesifikasi untuk mengontrol hak penerbitan DAT (Data Authentication Token) serta mengelola informasi algoritma tanda tangan dan enkripsi token beserta informasi kunci (Key)-nya.

Setiap sertifikat memiliki ID unik (`CID`), dan mengelola siklus hidup token secara aman dengan memaksakan periode penerbitan DAT yang diizinkan serta masa berlaku default (TTL) token yang dibuat.

---

## 2. Struktur Sertifikat (Structure)

<Struct type="cert" />


### 2.1. Spesifikasi Detail Per Bidang

`CID` : Hex (uint64)

* ID sertifikat unik yang mengidentifikasi sertifikat ini. Dipetakan ke bidang `CID` pada DAT untuk menentukan sertifikat mana yang digunakan saat validasi.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* Menyatakan **waktu mulai** penerbitan DAT menggunakan sertifikat ini dalam satuan detik (Seconds).

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* **Periode validitas penerbitan** sertifikat. Setelah jangka waktu ini (dalam detik) berlalu sejak `{{t('dat_issue_start')}}`, DAT baru tidak dapat lagi diterbitkan menggunakan sertifikat ini.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* Masa berlaku default (Time To Live) dari DAT yang diterbitkan oleh sertifikat ini. Saat membuat DAT, nilai `expire` ditetapkan sebagai waktu penerbitan (waktu saat ini) ditambah `dat-ttl`.

`{{t('sig_alg')}}` : String / Enum

* **Algoritma tanda tangan** yang digunakan untuk membuat dan memverifikasi bidang `signature` pada DAT.

`{{t('crypto_alg')}}` : String / Enum

* **Algoritma enkripsi** yang digunakan untuk mengenkripsi dan mendekripsi bidang `secure` pada DAT.

`{{t('sig_key')}}` : Base64Url (Binary)

* Data kunci yang digunakan untuk tanda tangan dan verifikasi. (Tergantung algoritma, dapat berupa Public/Private Key dari kunci asimetris atau kunci simetris.)

`{{t('crypto_key')}}` : Base64Url (Binary)

* Data kunci enkripsi yang digunakan untuk enkripsi dan dekripsi bidang `secure`.

---

## 3. {{t('alg')}}

### {{t('sig_alg')}}

Daftar algoritma tanda tangan untuk mencegah pemalsuan atau modifikasi DAT.

Mendukung metode kunci simetris dan kunci asimetris.

<br/>

**`ECDSA-P256`**
- Algoritma Tanda Tangan Digital Kurva Eliptik (NIST secp256r1)


**`ECDSA-P384`**
- Algoritma Tanda Tangan Digital Kurva Eliptik (NIST secp384r1)


**`ECDSA-P521`**
- Algoritma Tanda Tangan Digital Kurva Eliptik (NIST secp521r1)


**`HMAC-SHA256-MFS`**
- Keyed-Hashing berbasis kunci rahasia ukuran tetap (MFS) 256-bit


**`HMAC-SHA384-MFS`**
- Keyed-Hashing berbasis kunci rahasia ukuran tetap (MFS) 384-bit


**`HMAC-SHA512-MFS`**
- Keyed-Hashing berbasis kunci rahasia ukuran tetap (MFS) 512-bit



> **MFS (Maximum Fixed Secret):** Metode yang menggunakan kunci rahasia berukuran tetap dengan jumlah bit yang sama dengan ukuran keluaran (Output) algoritma hash.

---

### {{t('crypto_alg')}}

Daftar algoritma enkripsi terautentikasi (Authenticated Encryption) untuk melindungi data rahasia (bidang `secure`) di dalam DAT.

Hasil enkripsi memiliki bentuk gabungan IV dan data terenkripsi untuk mencegah dekripsi dan serangan penggunaan ulang.

<br/>

**`IV-AES128-GCM`**
- IV(96bit) + Hasil_Enkripsi(Binary)
- Mode AES-GCM menggunakan kunci 128-bit


**`IV-AES256-GCM`**
- IV(96bit) + Hasil_Enkripsi(Binary)
- Mode AES-GCM menggunakan kunci 256-bit


> **Internalisasi IV (Initialization Vector):** Untuk mencegah serangan penggunaan ulang (Replay Attack), NONCE (IV) unik berukuran 96-bit yang dibuat setiap kali enkripsi dilakukan digabungkan sebagai prefiks (Prefix) di depan data hasil enkripsi dan disertakan dalam biner. Saat mendekripsi, 96-bit pertama dipisahkan sebagai IV untuk kemudian dilakukan proses dekripsi.


<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
const {t} = useTranslate();
</script>
