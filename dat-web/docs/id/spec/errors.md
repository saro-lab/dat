# Kode Error

Kode error bersama untuk pustaka klien yang didukung secara resmi oleh DAT.

Setiap kode memiliki dua nilai — **dampak** dan **percobaan ulang** — dan sebagian ditandai tambahan dengan label **mencurigakan**.

## Dampak — kerusakan yang dialami layanan

Ini kriteria untuk memasang alert. Yang dilihat hanya satu hal: "apakah layanan sedang berhenti".

| Dampak | Arti | Contoh |
| --- | --- | --- |
| <span class="lg lg-critical">Kritis</span> | Layanan atau fungsi tertentu **berhenti.** Penerbitan tidak mungkin, sinkronisasi gagal permanen, inisialisasi gagal | Tidak ada satu pun sertifikat yang bisa dipakai di server penerbitan |
| <span class="lg lg-partial">Sebagian</span> | Sebagian permintaan atau siklus gagal, tetapi layanan tetap berjalan. Umumnya pulih sendiri | Satu siklus CMS gagal. Tetap berjalan dengan sertifikat yang ada |
| <span class="lg lg-none">Tanpa dampak</span> | Satu permintaan ditolak, selesai | Token palsu masuk. Cukup disaring |

**Tanpa dampak** bukan objek alert. Jika satu masukan salah harus diperiksa oleh seluruh penanggung jawab, alert kehilangan maknanya.

## Mencurigakan — selidiki jika berlanjut

Kode dengan label <span class="lg lg-suspect">Mencurigakan</span> **dalam satu kejadian adalah bagian dari operasi normal**. Klien bisa mengirim nilai yang salah kapan saja, dan menyaringnya memang tugas pustaka.

Namun jika error semacam ini terjadi **terus-menerus, atau menumpuk dari sumber tertentu**, penyebabnya salah satu dari dua ini.

- **Kesalahan konfigurasi** — deployment salah, klien versi lama masih tertinggal, atau sertifikat tidak selaras.
- **Percobaan peretasan** — upaya memanipulasi token atau kunci agar lolos verifikasi, atau penelusuran untuk menemukan nilai yang valid.

Karena itu kode-kode ini sebaiknya **dijadikan metrik berbasis jumlah**. Cukup memberi tahu saat melewati ambang batas.

## Percobaan Ulang

| Percobaan Ulang | Arti |
| --- | --- |
| <span class="lg lg-transient">Sementara</span> | Mencoba lagi setelah backoff akan menyelesaikannya |
| <span class="lg">Permanen</span> | Dilarang mencoba lagi. Konfigurasi atau masukan harus diperbaiki |
| <span class="lg">Status</span> | Ini sinyal, bukan error |

---

## Token

Masalah pada string token yang diterima itu sendiri.

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="Tolak permintaan">
Bagian yang dipisahkan titik bukan lima; atau <code>expire</code> bukan desimal murni; atau <code>cid</code> bukan heksadesimal murni; atau <code>plain</code> atau <code>secure</code> bukan base64url; atau kolom numerik melampaui rentang representasi bilangan bulat.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="Picu penerbitan ulang token">
<code>expire &lt;= now</code>. <strong>Tepat pada detiknya pun sudah kedaluwarsa</strong> — jika <code>expire == now</code>, token dianggap sudah habis masa berlakunya.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="Periksa log">
Error token yang tidak masuk ke kategori mana pun di atas.
</ErrorCode>

::: tip Kedaluwarsa dan error format wajib dibedakan
Responsnya berlawanan — kedaluwarsa adalah akhir masa hidup yang normal sehingga cukup memperbarui token, sedangkan error format berarti token itu sejak awal bukan terbitan kita dan harus ditolak.

Penguraian **memastikan struktur lebih dulu**, baru melihat nilainya. String seperti `"1.2.3"` yang kekurangan bagian bukanlah token kedaluwarsa melainkan memang bukan token, sehingga menjadi `DAT_TOKEN_MALFORMED`.

Tanda pada kolom `expire`, misalnya `+100`, juga error format, bukan kedaluwarsa. Hanya digit ASCII murni yang diizinkan.
:::

---

## Sertifikat

Masalah format string sertifikat, dan apakah sertifikat itu bisa dipakai sekarang.

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="Deploy ulang sertifikat">
Bagian yang dipisahkan titik bukan delapan; atau penguraian <code>cid</code>, <code>start</code>, <code>duration</code>, <code>ttl</code> gagal; atau kolom kunci bukan base64url; atau <code>start + duration + ttl</code> melampaui u64.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="Perbarui sertifikat">
<code>start + duration + ttl &lt; now</code>. Kondisi kedaluwarsa total: penerbitan maupun verifikasi sama-sama tidak mungkin.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="Tunggu">
<code>now &lt; start</code>. Jendela penerbitan belum terbuka.
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="Deploy sertifikat baru">
<code>now &gt; start + duration</code> tetapi ttl masih tersisa. Penerbitan tidak bisa, hanya verifikasi yang mungkin.
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="Periksa konfigurasi deployment">
Sertifikat hanya memuat kunci publik tanpa kunci privat penandatangan. Verifikasi berjalan, penerbitan tidak mungkin.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="Tolak permintaan">
Sertifikat yang sesuai dengan <code>cid</code> pada token tidak dimiliki. Ini token palsu atau salah deploy.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="Coba lagi setelah sinkronisasi">
<code>cid</code> tersebut belum diterima dari CMS. Terjadi sebentar tepat setelah sertifikat baru di-deploy.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="Periksa respons server">
Dalam daftar yang diimpor terdapat <code>cid</code> yang sama dua kali atau lebih.
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="Periksa log">
Error sertifikat yang tidak masuk ke kategori mana pun di atas.
</ErrorCode>

`DAT_CERT_NOT_FOUND` dan `DAT_CERT_NOT_SYNCED` tampak sama gejalanya tetapi responsnya berbeda. Yang pertama adalah `cid` yang tidak pernah kita terbitkan sehingga menunggu pun tidak akan muncul; yang kedua cukup menunggu sinkronisasi selesai.

Satu kejadian `DAT_CERT_NOT_FOUND` cukup disaring saja, tetapi lonjakan mendadak berarti deployment tidak selaras atau token palsu sedang beredar.

---

## Tanda Tangan

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="Blokir sesi, catat di log keamanan">
Verifikasi tanda tangan berakhir dengan <strong>ketidakcocokan</strong>. Nilai HMAC berbeda atau ECDSA verify mengembalikan false.
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="Tolak permintaan">
Bagian tanda tangan kosong; atau bukan base64url; atau panjang ECDSA <code>r‖s</code> tidak sesuai kurvanya; atau konversi ke DER gagal.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="Periksa konfigurasi server penerbitan">
Mencoba menandatangani dengan kunci verify-only. Kunci privat tidak tersedia saat runtime.
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="Periksa tipe kunci dan pustaka">
<strong>Operasi tanda tangan atau verifikasi itu sendiri tidak dapat dijalankan.</strong> Tipe kunci salah, handle sudah dilepas, atau error internal pustaka kriptografi.
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="Periksa log">
Error tanda tangan yang tidak masuk ke kategori mana pun di atas.
</ErrorCode>

::: warning Jangan campur ketidakcocokan dengan kegagalan backend
Kedua kode ini berada di sumbu yang berlawanan.

- `DAT_SIG_MISMATCH` — tanda tangan yang masuk sekadar tidak cocok, jadi **tidak ada dampak ke layanan**, tetapi jika berlanjut menjadi objek **curiga**.
- `DAT_SIG_BACKEND` — operasi verifikasinya sendiri tidak berjalan, jadi ini **masalah di pihak kita** dan bukan objek kecurigaan.

Jika tipe kunci yang salah atau bug pustaka dilaporkan sebagai "tanda tangan tidak cocok", situasi di mana kode kita sendiri rusak akan tercampur ke dalam metrik serangan. Sebaliknya, jika pemalsuan sungguhan diklasifikasikan sebagai error backend, ia hilang sama sekali dari metrik kecurigaan.
:::

---

## Enkripsi

Masalah enkripsi dan dekripsi payload secure.

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="Blokir sesi, catat di log keamanan">
Tag autentikasi AES-GCM tidak cocok. Entah secure telah dimanipulasi, atau kunci sertifikatnya berbeda.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="Tolak permintaan">
Ciphertext tidak kosong tetapi panjangnya kurang dari atau sama dengan IV (12 byte); atau masukan melampaui batas implementasi (<code>INT_MAX</code> dan sejenisnya).
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="Periksa dukungan platform">
Operasi enkripsi atau dekripsi tidak dapat dijalankan. Platform tanpa dukungan GCM atau kegagalan inisialisasi konteks.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="Periksa log">
Error enkripsi atau dekripsi yang tidak masuk ke kategori mana pun di atas.
</ErrorCode>

**Payload secure yang kosong bukan error.** Masukan kosong menghasilkan keluaran kosong dan tidak memunculkan kode apa pun.

Pada jalur yang melewati verifikasi tanda tangan, tag GCM adalah **satu-satunya pemeriksaan integritas**. Karena itu `DAT_CRYPTO_TAG_MISMATCH` tidak disatukan dalam satu kode dengan kegagalan dekripsi lainnya.

---

## Kunci

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="Ganti kunci">
Panjang kunci tidak cocok dengan algoritma yang dideklarasikan (HMAC 32/48/64, AES 16/32); atau titik tidak berada pada kurva; atau <code>d ∉ [1,n-1]</code>; atau format bukan uncompressed (0x04); atau kunci privat dan publik bukan pasangan.
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="Ganti algoritma">
Ekspor verify-only diminta untuk keluarga HMAC.
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="Periksa log">
Error kunci yang tidak masuk ke kategori mana pun di atas.
</ErrorCode>

**Tiga hal yang tampak mirip tetapi berbeda:**

| Kode | Arti |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **Batasan struktural algoritma.** HMAC bersifat simetris sehingga tidak mengenal konsep kunci publik |
| `DAT_SIG_KEY_MISSING` | **Kondisi runtime.** Saat ini kunci tersebut tidak memuat bagian privat |
| `DAT_CERT_VERIFY_ONLY` | **Bentuk deployment.** Sertifikat ini di-deploy khusus untuk verifikasi |

---

## Manajer

Kondisi objek yang menyimpan sertifikat dan memakainya untuk menerbitkan serta memverifikasi.

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="Periksa koneksi CMS">
Tidak memiliki satu pun sertifikat. Entah belum diimpor, atau sinkronisasi pertama dengan CMS gagal.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="Putuskan berdasarkan penyebab (cause) — tabel di bawah">
Sertifikat ada, tetapi tidak satu pun bisa dipakai menerbitkan saat ini. <strong>Penyebab disertakan bersama error.</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="Perbaiki kode pemanggil">
Manajer atau sertifikat yang sudah dilepas tetap digunakan.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="Periksa log">
Error manajer yang tidak masuk ke kategori mana pun di atas.
</ErrorCode>

Penyebab (`cause`) dari `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` adalah salah satu dari empat. **Tindakan yang harus diambil berbeda sama sekali untuk tiap penyebab.**

| Penyebab | Arti | Coba Lagi | Tindakan |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | Sebelum jendela penerbitan dimulai | **Sementara** | Selesai sendiri jika ditunggu |
| `DAT_CERT_ISSUANCE_ENDED` | Jendela penerbitan berakhir, hanya verifikasi | Permanen | Perlu men-deploy sertifikat baru |
| `DAT_CERT_EXPIRED` | Semua yang dimiliki sudah kedaluwarsa | Permanen | Perlu memperbarui sertifikat |
| `DAT_CERT_VERIFY_ONLY` | Semua yang dimiliki hanya untuk verifikasi | Permanen | **Kesalahan konfigurasi deployment** |

Jika server penerbitan dikonfigurasi hanya menerima sertifikat verifikasi, `DAT_CERT_VERIFY_ONLY` akan muncul. Menunggu tidak akan pernah menyelesaikannya, jadi bukan objek percobaan ulang.

---

## Konfigurasi

Masalah nilai yang diteruskan pemanggil. Semua kode keluarga `CONFIG` adalah **error yang harus diperbaiki di kode**; jika muncul saat operasional, berarti deployment-nya salah.

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="Periksa nama algoritma">
Nama algoritma tidak dikenal. Harus persis sama dengan notasi pada protokol (<code>ECDSA-P256</code>, <code>IV-AES256-GCM</code>).
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="Perbaiki kode pemanggil">
Argumen wajib bernilai null; atau di luar rentang yang diizinkan (nilai waktu negatif, <code>interval &lt;= 0</code>); atau tipe yang tidak didukung (pada bahasa bertipe dinamis, payload diisi angka atau boolean); atau body yang akan ditandatangani kosong.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="Perbaiki URI">
URI server CMS di luar spesifikasi: tidak bisa diurai, skema bukan http/https, atau mengandung path maupun query.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="Periksa log">
Error konfigurasi yang tidak masuk ke kategori mana pun di atas.
</ErrorCode>

---

## Internal

Masalah lingkungan eksekusi dan runtime.

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="Periksa deployment dan platform">
Backend kriptografi atau API runtime sama sekali tidak ada. <code>crypto.subtle</code> tidak tersedia, platform tanpa dukungan AES-GCM, atau versi runtime di bawah syarat.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="Periksa log">
Gagal mengalokasikan memori, gagal membangkitkan bilangan acak, gagal memperoleh lock, atau mencapai cabang yang dirancang tidak terjangkau.
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` selesai dengan memperbaiki lingkungan deployment, sedangkan `DAT_INTERNAL_UNKNOWN` umumnya gangguan runtime atau bug pustaka.

---

## Sinkronisasi CMS

Jika sinkronisasi CMS tidak dipakai, kode-kode ini tidak muncul.

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="Coba lagi setelah backoff">
Kegagalan DNS, koneksi ditolak, kegagalan TLS, <strong>timeout</strong>. Timeout tidak punya kode tersendiri dan termasuk di sini — karena responsnya sama.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="Periksa pengaturan token">
Server merespons 401. Token tidak ada atau salah.
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="Periksa tingkat token">
Server merespons 403. Token valid tetapi tidak berwenang atas endpoint ini.
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="Periksa pengaturan URL">
Server merespons 404. URL-nya salah.
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="Coba lagi setelah backoff">
Server merespons 5xx.
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="Periksa kode status">
Respons non-2xx yang tidak termasuk kasus mana pun di atas.
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="Periksa versi server">
Respons tidak memuat baris versi; atau baris versi bukan desimal murni; atau melampaui rentang.
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="Periksa CERT_* / KEY_* pada cause">
Respons diterima tetapi sertifikat gagal diterapkan. <strong>Penyebabnya termuat dalam <code>cause</code>.</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="Ditangani otomatis">
Server mengembalikan versi yang lebih lama daripada milik kita. Ini instruksi sinkronisasi ulang menyeluruh.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="Tunggu sinkronisasi pertama">
Kondisi di mana sinkronisasi belum pernah sekali pun berhasil.
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
Sinkronisasi sebelumnya masih berjalan sehingga siklus kali ini dilewati. Ini bukan error.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="Periksa opsi build">
Fungsi CMS tidak disertakan dalam build. Feature tidak diaktifkan atau CURL tidak terpasang.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="Periksa log">
Error CMS yang tidak masuk ke kategori mana pun di atas.
</ErrorCode>

Kode yang membuat sinkronisasi dinilai **gagal permanen** (`UNAUTHORIZED`, `FORBIDDEN`, `ENDPOINT_NOT_FOUND`, `MALFORMED`, `IMPORT_FAILED`) semuanya kritis. Mencoba lagi tidak menyelesaikannya sementara sertifikat terus kedaluwarsa, sehingga jika dibiarkan layanan pasti berhenti.

Sebaliknya `UNREACHABLE` dan `SERVER_ERROR` bersifat sebagian. Layanan tetap berjalan dengan sertifikat yang ada dan pulih sendiri pada siklus berikutnya — **namun jika terus gagal, pada akhirnya berpindah menjadi kritis.** Pasang alert berdasarkan jumlah kegagalan beruntun.

::: tip Kegagalan sinkronisasi tidak dilempar sebagai exception
Meskipun sinkronisasi pertama gagal, manajer tetap dikembalikan secara normal — karena tersinkronisasi terlambat masih lebih baik daripada tidak sama sekali. Sebagai gantinya, kegagalan tersimpan sebagai **kondisi yang bisa dikueri**.

| Klien | Cara mengambil |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

Jika belum pernah berhasil sekali pun bernilai `DAT_CMS_NOT_SYNCED`, jika normal kosong.
:::

---

## Server

Kode yang dikeluarkan server CMS. Klien **tidak membuat** kode ini, hanya **menerimanya**.

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
Header <code>Authorization</code> tidak ada, atau token tidak terdaftar pada tingkat mana pun.
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
Token terdaftar tetapi tingkatnya bukan yang diminta endpoint ini.
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="Segera atur token">
Tidak ada satu pun token yang dikonfigurasi sehingga autentikasi mati sepenuhnya. <strong>Bahkan API penerbitan sertifikat pun terbuka tanpa autentikasi.</strong> Tidak muncul pada respons, hanya tercatat di log saat startup.
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
Parameter path atau query tidak dapat diurai, atau argumen di luar rentang yang diizinkan (delay negatif, melebihi 10 tahun, dan sejenisnya).
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
Nama algoritma pada path permintaan tidak dikenal.
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
Rute tersebut tidak ada atau metodenya berbeda.
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
Ukuran body permintaan terlampaui.
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
Error permintaan yang tidak masuk ke kategori mana pun di atas.
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="Coba lagi setelah backoff">
Koneksi DB terputus, connection pool habis, kontensi lock, timeout. <strong>Satu-satunya kode yang memakai 503</strong>, yaitu sinyal agar klien tahu "yang ini cukup ditunggu".
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="Periksa kondisi DB">
Kegagalan baca atau tulis, tabel tidak ada, skema tidak cocok, baris sertifikat tersimpan rusak.
</ErrorCode>

Amplop respons:

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

Error yang muncul saat membuat dan menangani sertifikat juga dikeluarkan server memakai kode bersama di atas (`DAT_CERT_*`, `DAT_KEY_*`, `DAT_CONFIG_*`).

### Saat menerima kode server

Klien membungkus kode server dengan kode `CMS` miliknya sendiri, dan menyimpan aslinya di `cause`.

| Yang diterima | HTTP | Kode yang dikeluarkan klien |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (lainnya) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (penurunan versi) | 200 | `DAT_CMS_VERSION_RESET` |

---

## Cari berdasarkan gejala

| Gejala | Kode |
| --- | --- |
| Berhasil tepat setelah login, lalu ditolak tak lama kemudian | `DAT_TOKEN_EXPIRED` — masa hidup token habis. Cukup diterbitkan ulang |
| Verifikasi gagal hanya pada server tertentu | `DAT_CERT_NOT_SYNCED` — server itu belum menerima CID yang baru |
| Token yang sama ditolak di semua server | `DAT_CERT_NOT_FOUND` — ini CID yang tidak pernah kita terbitkan |
| Server penerbitan tidak bisa membuat token | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **yang ter-deploy adalah verify-only** |
| Penerbitan gagal hanya sesaat setelah startup | `DAT_MANAGER_NO_CERTIFICATE` — ini sebelum sinkronisasi pertama. Sebentar lagi teratasi |
| Sinkronisasi CMS terus gagal | `DAT_CMS_UNAUTHORIZED` — token salah. Mencoba lagi tidak menyelesaikannya |
| Tidak ada satu pun sertifikat yang datang | `DAT_CMS_ENDPOINT_NOT_FOUND` — salah ketik URL |
| Gagal hanya pada platform tertentu | `DAT_INTERNAL_UNAVAILABLE` — backend kriptografi tidak ada |
| Kegagalan verifikasi tiba-tiba melonjak | `DAT_SIG_MISMATCH` — satu kejadian tidak berbahaya, tetapi **jika menumpuk berarti percobaan pemalsuan** |
| Dekripsi secure tiba-tiba gagal | `DAT_CRYPTO_TAG_MISMATCH` — sertifikat tidak selaras atau **percobaan manipulasi** |
| Ada peringatan di log startup CMS | `DAT_AUTH_DISABLED` — **autentikasi mati.** API penerbitan terbuka |

---

## Lampiran

### Sintaks Kode

```
DAT_<area>_<penyebab>
```

- Jika penyebab yang sama muncul di area berbeda, **nama penyebabnya sama.** `DAT_TOKEN_MALFORMED` dan `DAT_CERT_MALFORMED` hanya berbeda objeknya, maknanya sama.
- `_UNKNOWN` adalah **khusus fallback** untuk tiap area. Ia tidak dipakai dalam arti "algoritma tidak dikenal" (untuk itu ada `_UNSUPPORTED`).
- String kode adalah kontrak publik. Pesan boleh diubah bebas, tetapi kode tidak.

| Kategori | Prefiks kode |
| --- | --- |
| Token | `DAT_TOKEN_` |
| Sertifikat | `DAT_CERT_` |
| Tanda Tangan | `DAT_SIG_` |
| Enkripsi | `DAT_CRYPTO_` |
| Kunci | `DAT_KEY_` |
| Manajer | `DAT_MANAGER_` |
| Konfigurasi | `DAT_CONFIG_` |
| Internal | `DAT_INTERNAL_` |
| Sinkronisasi CMS | `DAT_CMS_` |
| Server | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### Akses per Klien

| Klien | Tipe error | Kode | Klasifikasi coba lagi | Peristiwa keamanan |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| Server CMS | Amplop JSON | kolom `code` | — | — |

`Peristiwa keamanan` hanya mengembalikan `true` untuk dua kode di mana pemalsuan atau manipulasi sudah pasti (`DAT_SIG_MISMATCH`, `DAT_CRYPTO_TAG_MISMATCH`). Label **curiga** pada dokumen ini mencakup lingkup yang lebih luas (termasuk token, kunci, dan permintaan yang dimanipulasi), dan untuk saat ini hanya klasifikasi dokumen, tidak diekspos sebagai API klien.

Tingkat **dampak** juga merupakan klasifikasi dokumen. Kode yang sama bisa berbeda pukulannya tergantung di mana ia muncul — misalnya `DAT_KEY_INVALID` tidak berdampak apa-apa saat menyaring token yang masuk, tetapi jika muncul saat membaca sertifikat di tengah sinkronisasi CMS, seluruh sinkronisasi gagal.

**Penyebab dasar tidak dibuang.** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` dan `DAT_CMS_IMPORT_FAILED` meneruskan penyebabnya melalui rantai exception masing-masing bahasa (`cause` / `__cause__` / `InnerException` / `Unwrap()`).

::: warning C/C++ tetap mempertahankan nilai numerik
Nilai numerik `dat_error_t` yang lama dipertahankan demi kompatibilitas ABI, tetapi **kode stringlah yang menjadi acuan**. Pustaka tidak lagi mengembalikan nilai lama, sehingga perbandingan seperti `err == DAT_ERROR_INVALID_DAT` tidak akan cocok. Bandingkan melalui `dat_error_code(e)`.

C tidak memiliki rantai exception, jadi penyebabnya dikueri terpisah lewat `dat_manager_issuable_cause()`.
:::

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>

<style scoped>
/* 범례 배지 — ErrorCode 컴포넌트의 배지와 같은 모양이라 눈으로 바로 이어진다. */
.lg {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
}
.lg          { background: color-mix(in srgb, currentColor 8%, transparent); opacity: 0.7; }
.lg-critical { background: color-mix(in srgb, #dc2626 16%, transparent); color: #dc2626; opacity: 1; }
.lg-partial  { background: color-mix(in srgb, #ea580c 16%, transparent); color: #ea580c; opacity: 1; }
.lg-none     { background: color-mix(in srgb, currentColor 8%, transparent); color: var(--c-muted); opacity: 1; }
.lg-suspect  { background: none; border: 1px solid color-mix(in srgb, var(--c-accent-2) 55%, transparent); color: var(--c-accent-2); opacity: 1; }
.lg-transient { background: color-mix(in srgb, var(--c-link-1) 16%, transparent); color: var(--c-link-1); opacity: 1; }
</style>
