# Sinkronisasi CMS dan Operasi Sertifikat

## 1. Ikhtisar

**DAT CMS (Certificate Management Service)** adalah server yang membuat dan menyebarkan sertifikat untuk dibagikan ke seluruh klaster.

Setiap aplikasi mengambil daftar sertifikat secara berkala melalui klien CMS (`DatCmsManager`), dan sinkronisasi inilah yang **mengotomatiskan rotasi kunci**. Tanpa operator perlu mengganti kunci secara manual, sertifikat dibuat ulang sesuai siklus yang ditetapkan dan yang lama kedaluwarsa dengan sendirinya.

<ArchFlow
    :user="{label: 'Pengguna', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Membuat sertifikat per masa berlaku', 'Membersihkan yang kedaluwarsa']}"
    :service="{servers: [
        {label: 'Server login', kind: 'issuer', icon: 'login',
         request: 'Permintaan login', response: 'Menerbitkan DAT dengan sertifikat', sync: 'Sinkronisasi sertifikat penerbitan'},
        {label: 'Server konten', kind: 'verifier', icon: 'apps',
         request: 'Permintaan konten dengan DAT', response: 'Memverifikasi DAT lalu melayani', sync: 'Sinkronisasi sertifikat verifikasi'},
    ]}"
/>

Hanya server login yang menerima sertifikat yang bisa dipakai menerbitkan; server konten hanya menerima sertifikat khusus verifikasi. **Server konten cukup mengenal CMS saja dan tidak perlu mengenal server login.**

---

## 2. Protokol Sinkronisasi

### 2.1. Permintaan dan Respons

<FlowDiagram
    title="Satu siklus sinkronisasi"
    :legend="{req: 'Permintaan', res: 'Respons', sync: 'Sinkronisasi sertifikat'}"
    :actors="[
        {id: 'app', label: 'Aplikasi', kind: 'issuer'},
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
    ]"
    :steps="[
        {from: 'app', label: 'version yang dimiliki = N', kind: 'note'},
        {from: 'app', to: 'cms', label: 'GET /v1/certs?version=N (Authorization: token)', kind: 'req'},
        {from: 'cms', label: 'version server = M, memilih sertifikat yang lebih baru dari N', kind: 'note'},
        {from: 'cms', to: 'app', label: 'Baris 1: M / baris 2 dst.: daftar sertifikat', kind: 'res'},
        {from: 'app', label: 'Bila daftarnya kosong, pertahankan version lalu selesai', kind: 'note'},
        {from: 'app', label: 'version = M hanya bila import(clear = true) berhasil', kind: 'note'},
    ]"
/>

| Endpoint | Kegunaan |
| --- | --- |
| `GET /v1/certs?version=N` | Sertifikat penuh (termasuk kunci privat tanda tangan) |
| `GET /v1/certs/verify-only?version=N` | Sertifikat khusus verifikasi |
| `GET /v1/certs.json`, `/v1/certs/verify-only.json` | Isi yang sama dalam format JSON |
| `POST /v1/cert/{sig-alg}/{crypto-alg}/{delay}/{duration}/{ttl}` | Pembuatan sertifikat secara manual (perlu token Master) |
| `GET /health` | Pemeriksaan status |

Badan respons berupa teks biasa yang **baris pertamanya adalah version terkini milik server**, lalu mulai baris berikutnya berisi sertifikat, satu per baris.

```
1712345678
1a.1712345000.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
2b.1712348600.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
```

### 2.2. Kursor Versi

Klien mengingat version terakhir yang berhasil dan menyertakannya pada permintaan berikutnya. Server hanya memilih dan mengembalikan sertifikat yang lebih baru daripada nilai tersebut.

* Bila version klien **lebih lama daripada server** → hanya sertifikat yang muncul sesudahnya yang dikembalikan.
* Bila version klien **lebih baru daripada server** (penggantian server, inisialisasi DB, dan sebagainya) → kursor dikembalikan ke `0` dan **seluruh set** dikirimkan.
* Klien **hanya memajukan version bila pengambilannya berhasil.** Ini untuk mencegah situasi di mana kursor terlanjur maju akibat respons yang gagal sehingga sertifikat terlewat selamanya.

::: tip Permintaannya inkremental, tetapi responsnya adalah penggantian menyeluruh
`?version=N` adalah permintaan "berikan perubahan setelah N", namun klien **tidak menggabungkan daftar yang diterima dengan daftar yang ada, melainkan menggantinya (clear = true)**. Sebab server selalu menilai dan mengirimkan keseluruhan sertifikat yang valid, dan berkat cara ini sertifikat yang telah dicabut (revoke) di CMS tidak tertinggal di klien.
:::

### 2.3. Token Autentikasi

CMS membagi akses melalui tiga jenis token.

| Token | Kewenangan |
| --- | --- |
| `{{t('master_token')}}` | {{t('master_token_desc')}} |
| `{{t('full_cert_token')}}` | {{t('full_cert_token_desc')}} |
| `{{t('verify_cert_token')}}` | {{t('verify_cert_token_desc')}} |

Prinsipnya, server yang hanya melakukan verifikasi cukup diberi token Verify Cert saja. Namun karena kunci enkripsi tetap disertakan pada respons verify-only, silakan periksa juga peringatan pada dokumen [{{t('menu_spec_cert')}}](./dat-certificate#_5-ekspor-verify-only) untuk memahami implikasinya.

---

## 3. Penundaan Penerbitan Sertifikat (delay)

Bila sertifikat baru langsung dipakai untuk menerbitkan begitu dibuat, node lain yang belum menyinkronkannya tidak akan dapat memverifikasi token yang ditandatangani dengan sertifikat tersebut. **Penundaan penerbitan** adalah nilai untuk menghilangkan celah ini.

<CertTimeline
    title="Apa yang dilakukan segmen penundaan"
    caption="Selama segmen penundaan, seluruh node mengambil sertifikat, dan barulah setelah itu penerbitan dimulai."
    :marks="['Pembuatan', 'Mulai penerbitan', 'Akhir penerbitan', 'Kedaluwarsa akhir']"
    :phases="[
        {label: 'Penundaan penerbitan', weight: 1.2, kind: 'delay', note: 'Menunggu sinkronisasi seluruh node'},
        {label: 'Dapat menerbitkan', weight: 3, kind: 'issue', note: 'Penerbitan + verifikasi'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: 'Hanya verifikasi'},
    ]"
/>

Sebagai contoh, misalkan CMS membuat sertifikat A dan server 1 serta 2 melakukan sinkronisasi dengan siklus 60 detik. Bila server 1 menerimanya lebih dulu lalu menerbitkan DAT dengan A sementara server 2 belum menerimanya, maka server 2 tidak dapat memverifikasi DAT tersebut.

Bila penundaannya ditetapkan 180 detik, maka selama 180 detik setelah sertifikat dibuat, sertifikat itu tetap dalam keadaan tidak dapat menerbitkan, dan dalam rentang itu seluruh server menyelesaikan sinkronisasinya dengan aman. Dengan memperhitungkan gangguan jaringan sesaat, disarankan menetapkan nilai ini **minimal 3–4 kali lebih besar daripada siklus sinkronisasi tiap server**.

---

## 4. Perilaku yang Disengaja

Seluruh perilaku berikut **memang disengaja secara desain** dan bukan cacat. Perilaku ini dijelaskan secara eksplisit karena saat operasional dapat terlihat berbeda dari dugaan.

### 4.1. Penandatanganan terus berlanjut dengan sertifikat yang tersimpan di cache meskipun jendela penerbitan sudah tertutup

Aplikasi terus menggunakan sertifikat penerbitan yang dipilihnya pada saat sinkronisasi, dan tidak memeriksa ulang `issuable()` pada setiap penerbitan.

**Alasan:** bila jendela penerbitan tertutup saat koneksi ke CMS terputus, pada pendekatan pemeriksaan ulang **seluruh proses login layanan akan berhenti** saat itu juga. DAT memilih sikap "meskipun sertifikat baru belum diterima, penerbitan tetap dilanjutkan dulu".

**Konsekuensinya:** bila gangguan jaringan berlangsung lama, token dapat terus keluar dengan sertifikat yang jendela penerbitannya sudah lewat. Namun token tersebut tetap terverifikasi normal di node lain hingga sertifikat mencapai kedaluwarsa akhirnya, sehingga ini dinilai sebagai trade-off yang lebih baik daripada layanan mati saat terjadi gangguan.

### 4.2. Sertifikat yang diperbarui dengan CID yang sama akan dibuang

Bila masuk sertifikat dengan CID yang sama dengan CID yang sudah dimiliki, maka **sertifikat yang baru masuk itulah yang diabaikan**.

**Alasan:** CID adalah pengenal sertifikat yang tidak berubah. Bila satu CID yang sama menunjuk ke kunci yang berbeda, maka tidak dapat diketahui lagi dengan kunci mana token yang sudah diterbitkan dan beredar harus diverifikasi.

::: warning Penggantian kunci wajib memakai CID baru
Bila Anda menyebarkan penggantian kunci sambil mempertahankan CID yang sama, **perubahannya tidak akan pernah tercermin di klien dan galat pun tidak muncul.** Saat mengganti kunci, terbitkanlah sertifikat dengan CID baru.
:::

### 4.3. Bila tidak ada sertifikat baru, daftar yang ada dipertahankan

Bila respons tidak memuat satu sertifikat pun, klien **membiarkan daftar yang dimilikinya apa adanya.** Daftar tersebut tidak dikosongkan.

**Alasan:** bila sertifikat yang dimiliki dikosongkan justru pada saat terburuk — ketika server sertifikat mati atau responsnya tidak normal — maka saat itu juga **seluruh verifikasi token akan gagal**. Bila tidak ada yang baru diterima, lebih aman bertahan dengan yang sudah ada.

### 4.4. Mode SINGLE_NODE membuat sertifikat setiap kali dijalankan

Bila CMS dijalankan dalam mode node tunggal, ia **membuat satu sertifikat pada setiap kali start**, terlepas dari ada atau tidaknya sertifikat yang dapat menerbitkan.

**Alasan:** mode node tunggal adalah konfigurasi untuk menjalankan CMS secara mandiri tanpa infrastruktur terpisah. Karena itu harus sudah tersedia sertifikat yang siap menerbitkan tepat setelah start.

**Perhatian:** bila restart berulang kali, sertifikat akan terus menumpuk. Namun setiap sertifikat dikeluarkan dari daftar begitu melewati waktu kedaluwarsanya sendiri, sehingga jumlahnya tidak bertambah tanpa batas.

### 4.5. Bila tidak ada sertifikat yang dapat menerbitkan, penerbitan langsung dilakukan tanpa penundaan

Bila pada saat pembuatan sertifikat tidak ada satu pun sertifikat yang dapat menerbitkan, CMS **melewati segmen penundaan** dan menggabungkan waktu penundaan itu ke dalam jendela penerbitan.

**Alasan:** bila penundaan tetap dipatuhi, selama waktu tersebut seluruh klaster tidak dapat menerbitkan satu token pun. Pada situasi start pertama atau pemulihan dari gangguan menyeluruh, penerbitan harus dapat dilakukan segera. Pada kasus ini, sebuah peringatan dicatat di log server.

---

## 5. Penarikan dan Kedaluwarsa Sertifikat

* Sertifikat tetap berada di daftar penyebaran **hingga saat kedaluwarsa akhirnya (`start + duration + ttl`)**. Sertifikat tidak langsung hilang hanya karena jendela penerbitannya tertutup.
* DAT yang keluar tepat sebelum jendela penerbitan berakhir masih hidup selama TTL-nya, sehingga server verifikator yang baru pertama kali dijalankan setelah saat itu pun tetap dapat menerima sertifikatnya dan memverifikasi token tersebut.
* Sertifikat yang telah melewati kedaluwarsa akhir dikeluarkan dari daftar, dan pada proses pembersihan berikutnya juga dihapus dari penyimpanan.

---

## 6. Deployment

Opsi menjalankan server CMS, metode deployment Docker · Kubernetes · biner, serta variabel lingkungannya dibahas pada dokumen terpisah.

- [Panduan Deployment {{t('menu_svc_cms')}}](../svc/docker-saro-lab-dat-cms)

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import ArchFlow from "../../.vitepress/ui/ArchFlow.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
const {t} = useTranslate();
</script>
