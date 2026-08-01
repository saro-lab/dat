# Sertifikat DAT

## 1. Ikhtisar

**Sertifikat DAT** adalah spesifikasi untuk mengendalikan kewenangan penerbitan DAT serta mengelola algoritma tanda tangan, algoritma enkripsi, dan informasi kunci (Key) milik token.

Setiap sertifikat memiliki ID unik (`CID`), dan mengelola siklus hidup token secara aman dengan mewajibkan jendela penerbitan DAT serta masa berlaku (TTL) token yang dihasilkan.

Pada DAT, **rotasi kunci bukanlah pilihan.** Karena jendela penerbitan tertanam di dalam sertifikat pada tingkat spesifikasi, setelah periode tersebut lewat, sertifikat itu tidak dapat lagi membuat token baru.

---

## 2. Struktur Sertifikat

<WireFormat
    title="Format wire sertifikat"
    hint="Arahkan kursor ke setiap bidang untuk menampilkan penjelasannya."
    :segments="[
        {name: 'cid', type: 'uint64 (heksadesimal)', kind: 'meta', note: 'ID unik sertifikat. Dicocokkan dengan bidang cid milik DAT.'},
        {name: 'start', type: 'uint64 (desimal)', kind: 'meta', note: 'Waktu mulai penerbitan (Unixtime detik).'},
        {name: 'duration', type: 'uint64 (desimal)', kind: 'meta', note: 'Durasi jendela penerbitan (detik). Ini adalah durasi, bukan waktu absolut.'},
        {name: 'ttl', type: 'uint64 (desimal)', kind: 'meta', note: 'Masa berlaku (detik) DAT yang diterbitkan dengan sertifikat ini.'},
        {name: 'sig-alg', type: 'String', kind: 'plain', note: 'Nama algoritma tanda tangan.'},
        {name: 'crypto-alg', type: 'String', kind: 'plain', note: 'Nama algoritma enkripsi.'},
        {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Kunci tanda tangan. Bila diekspor sebagai verify-only, ECDSA hanya mengeluarkan kunci publiknya.'},
        {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Kunci enkripsi. Karena bersifat simetris, kunci ini selalu keluar utuh terlepas dari verify-only atau tidak.'},
    ]"
/>

```
cid . start . duration . ttl . sig-alg . crypto-alg . sig-key . crypto-key
```

<Struct type="cert" />

### 2.1. Spesifikasi Detail Per Bidang

`CID` : Hex (uint64)

* ID sertifikat unik yang mengidentifikasi sebuah sertifikat. Dipetakan dengan bidang `CID` milik DAT untuk menentukan sertifikat mana yang digunakan saat verifikasi.
* **CID adalah pengenal yang tidak berubah.** Saat mengganti kunci, jangan gunakan ulang CID yang sama; terbitkan sertifikat dengan CID baru.

`{{t('dat_issue_start')}}` : uint64 (Unix Time)

* Menyatakan **waktu mulai** DAT dapat diterbitkan menggunakan sertifikat tersebut, dalam satuan detik (Seconds).

`{{t('dat_issue_dur')}}` : uint64 (Seconds)

* **Durasi berlakunya penerbitan** milik sertifikat. Setelah durasi ini (dalam detik) berlalu sejak `{{t('dat_issue_start')}}`, sertifikat ini tidak dapat lagi menerbitkan DAT baru.
* **Ini adalah durasi (duration), bukan waktu absolut.** Waktu berakhirnya dihitung sebagai `start + duration`.

`{{t('dat_ttl')}}` : uint64 (Seconds)

* Masa berlaku (Time To Live) DAT yang diterbitkan dengan sertifikat ini. Saat DAT dibuat, nilai `expire` ditetapkan dengan menambahkan nilai ini ke waktu penerbitan.

`{{t('sig_alg')}}` : String / Enum

* **Algoritma tanda tangan** yang digunakan saat membuat dan memverifikasi bidang `signature` milik DAT.

`{{t('crypto_alg')}}` : String / Enum

* **Algoritma enkripsi** yang digunakan saat mengenkripsi dan mendekripsi bidang `secure` milik DAT.

`{{t('sig_key')}}` : Base64Url (Binary)

* Data kunci yang digunakan untuk penandatanganan dan verifikasi. (Bergantung pada algoritmanya, dapat berupa Public/Private Key asimetris maupun kunci simetris.)

`{{t('crypto_key')}}` : Base64Url (Binary)

* Data kunci enkripsi yang digunakan untuk enkripsi dan dekripsi bidang `secure`.

### 2.2. Perhitungan Waktu

```
end    = start + duration        waktu berakhirnya penerbitan
expire = end + ttl               waktu kedaluwarsa akhir sertifikat
```

* Seluruh perhitungan dilakukan dalam uint64 dan **hanya overflow yang ditolak** sebagai galat.
* `duration = 0` dan `ttl = 0` adalah **nilai yang sah**. Keduanya dapat merepresentasikan sertifikat yang jendela penerbitannya langsung tertutup, atau sertifikat yang menghasilkan token yang langsung tidak berlaku begitu kedaluwarsa.
* Karena seluruh bidangnya berupa bilangan bulat tak bertanda, **nilai negatif tidak eksis secara tipe.**

### 2.3. Tanda Tangan Konstruktor

Seluruh implementasi bahasa menggunakan urutan argumen berikut.

```
(cid, dat_issuance_start_seconds, dat_issuance_duration_seconds, dat_ttl_seconds,
 signature_key, crypto_key)
```

::: warning Argumen ketiga adalah durasi, bukan waktu berakhir
Bila Anda melewatkan waktu berakhir absolut (end) pada argumen ketiga, maka tanpa galat apa pun akan terbentuk **sertifikat dengan jendela berlaku yang keliru.** Sebab nilai tersebut masuk apa adanya ke `start + duration`.
:::

---

## 3. Siklus Hidup Sertifikat

<CertTimeline
    title="Empat segmen sertifikat"
    caption="Sertifikat baru benar-benar kedaluwarsa setelah melewati seluruh segmen penundaan penerbitan → dapat menerbitkan → sisa TTL DAT."
    :marks="['Pembuatan', 'Mulai penerbitan', 'Akhir penerbitan', 'Kedaluwarsa akhir']"
    :phases="[
        {label: 'Penundaan penerbitan (delay)', weight: 1.2, kind: 'delay', note: 'Waktu bagi seluruh node untuk mengambil sertifikat'},
        {label: 'Dapat menerbitkan (duration)', weight: 3, kind: 'issue', note: 'Penerbitan + verifikasi DAT sama-sama dimungkinkan'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: 'Tidak dapat menerbitkan, hanya dapat memverifikasi'},
    ]"
/>

| Segmen | Penerbitan | Verifikasi | Penentuan |
| --- | --- | --- | --- |
| Penundaan penerbitan | ✕ | ○ | `issuable() == false` |
| Dapat menerbitkan | ○ | ○ | `issuable() == true` |
| Sisa TTL DAT | ✕ | ○ | Jendela penerbitan tertutup namun belum kedaluwarsa |
| Setelah kedaluwarsa akhir | ✕ | ✕ | `expired() == true` |

* **Kelayakan menerbitkan** ditentukan oleh `signable() && start <= now <= end`, dan **kedua ujungnya termasuk**.
* Setelah jendela penerbitan tertutup pun, sertifikat masih hidup selama `ttl` lagi. Sebab token yang diterbitkan tepat sebelum jendela tertutup harus dapat menghabiskan masa hidupnya.
* Segmen **penundaan penerbitan (delay)** ada untuk memberi waktu bagi seluruh node di klaster mengambil sertifikat baru. Untuk detailnya, silakan lihat dokumen [{{t('menu_spec_cms')}}](./cms).

---

## 4. Algoritma

### 4.1. Algoritma Tanda Tangan

Berikut daftar algoritma tanda tangan untuk mencegah pemalsuan dan perubahan DAT. Mendukung metode kunci simetris maupun asimetris.

| Nama | Metode | Keterangan |
| --- | --- | --- |
| `ECDSA-P256` | Asimetris | Tanda tangan digital kurva eliptik (NIST secp256r1) |
| `ECDSA-P384` | Asimetris | Tanda tangan digital kurva eliptik (NIST secp384r1) |
| `ECDSA-P521` | Asimetris | Tanda tangan digital kurva eliptik (NIST secp521r1) |
| `HMAC-SHA256-MFS` | Simetris | Keyed-Hashing berbasis kunci rahasia berukuran tetap 256-bit |
| `HMAC-SHA384-MFS` | Simetris | Keyed-Hashing berbasis kunci rahasia berukuran tetap 384-bit |
| `HMAC-SHA512-MFS` | Simetris | Keyed-Hashing berbasis kunci rahasia berukuran tetap 512-bit |

> **MFS (Maximum Fixed Secret):** metode yang menggunakan kunci rahasia berukuran tetap dengan jumlah bit yang sama dengan ukuran keluaran (Output) algoritma hash-nya.

### 4.2. Algoritma Enkripsi

Berikut daftar algoritma enkripsi terautentikasi (Authenticated Encryption) untuk melindungi data rahasia di dalam DAT (bidang `secure`).

| Nama | Panjang kunci | Struktur |
| --- | --- | --- |
| `IV-AES128-GCM` | 128-bit | IV(96bit) + hasil enkripsi |
| `IV-AES256-GCM` | 256-bit | IV(96bit) + hasil enkripsi |

> **Internalisasi IV (Initialization Vector):** NONCE 96-bit (IV) unik yang dibangkitkan pada setiap enkripsi digabungkan sebagai awalan (Prefix) di depan hasil enkripsi. Saat dekripsi, 96 bit terdepan dipisahkan sebagai IV lalu proses dekripsi dijalankan.

### 4.3. Validasi Panjang Kunci

Saat memuat sertifikat, dilakukan **pemeriksaan apakah jumlah bit algoritma yang dideklarasikan cocok dengan panjang kunci sebenarnya**.

Sebagai contoh, bila sertifikat yang mendeklarasikan `IV-AES256-GCM` ternyata berisi kunci 16 byte, maka proses impornya sendiri akan ditolak. Tanpa pemeriksaan ini, sistem akan berjalan dengan AES-128 padahal diyakini menggunakan AES-256.

---

## 5. Ekspor verify-only

Server yang hanya melakukan verifikasi tidak perlu diberi kunci privat untuk penandatanganan. Untuk itu, sertifikat DAT menyediakan **ekspor verify-only**.

<FlowDiagram
    title="Jalur penyebaran sertifikat penuh dan sertifikat verify-only"
    :legend="{req: 'Permintaan', res: 'Respons', sync: 'Penyebaran sertifikat'}"
    :actors="[
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
        {id: 'issuer', label: 'Server penerbit', kind: 'issuer'},
        {id: 'verifier', label: 'Server khusus verifikasi', kind: 'node'},
    ]"
    :steps="[
        {from: 'issuer', to: 'cms', label: 'GET /v1/certs', kind: 'req'},
        {from: 'cms', to: 'issuer', label: 'Sertifikat penuh (termasuk kunci privat tanda tangan)', kind: 'sync'},
        {from: 'verifier', to: 'cms', label: 'GET /v1/certs/verify-only', kind: 'req'},
        {from: 'cms', to: 'verifier', label: 'Sertifikat verify-only', kind: 'sync'},
    ]"
/>

| Algoritma tanda tangan | `support_verify_only()` | Hasil ekspor verify-only |
| --- | --- | --- |
| Keluarga **ECDSA** | `true` | Kunci tanda tangan keluar **hanya berupa kunci publik** (Base64 130 karakter → 87 karakter) |
| Keluarga **HMAC** | `false` | Terjadi **galat eksplisit** |

HMAC adalah kunci simetris sehingga tidak ada yang namanya "kunci yang hanya bisa memverifikasi". Karena itu, upaya melakukan ekspor verify-only tidak dilewati secara diam-diam melainkan **langsung dilaporkan sebagai galat.** Karena memanggil ekspor verify-only saat masih ada sertifikat HMAC yang tercampur akan gagal, maka bila Anda mengoperasikan node khusus verifikasi, gunakanlah keluarga ECDSA.

::: danger Kunci enkripsi tetap keluar utuh bahkan pada verify-only
Kunci AES untuk bidang `secure` adalah **kunci simetris**, sehingga **selalu diekspor secara utuh** terlepas dari verify-only atau tidak. Sebab untuk mendekripsi diperlukan kunci yang sama dengan yang dipakai mengenkripsi.

Dengan kata lain, server yang menerima sertifikat verify-only:

* **Tidak dapat memalsukan tanda tangan** — karena tidak memiliki kunci privat, ia tidak dapat membuat DAT baru.
* **Dapat mendekripsi payload `secure`** — kerahasiaan terhadap mereka tidak disediakan.

verify-only adalah mekanisme untuk membagi *kewenangan penerbitan*, bukan mekanisme untuk membagi *kerahasiaan*. Bila ada nilai yang harus disembunyikan dari node verifikasi, nilai tersebut tidak boleh dimasukkan ke `secure`.
:::

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import Struct from "../../.vitepress/ui/Struct.vue";
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
const {t} = useTranslate();
</script>
