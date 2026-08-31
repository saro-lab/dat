# DAT CMS

DAT CMS adalah layanan opsional yang membuat, menyimpan, dan mengirim sertifikat kepada manajer klien. Dokumen ini menjelaskan kontrak sinkronisasi antara klien dan server. Untuk instalasi dan pengoperasian, lihat [panduan layanan DAT CMS](../svc/docker-saro-lab-dat-cms).

<FlowDiagram
  title="Sinkronisasi sertifikat"
  :actors="[
    {id: 'client', label: 'Klien', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'Meminta versi saat ini dan sertifikat', kind: 'req'},
    {from: 'cms', to: 'client', label: 'Merespons dengan versi dan sertifikat', kind: 'res'},
    {from: 'client', label: 'Memvalidasi seluruhnya lalu menerapkan secara atomik', kind: 'note'},
  ]"
/>

## Endpoint berdasarkan peran

| Peran | Path | Kegunaan |
| --- | --- | --- |
| Mengambil sertifikat lengkap | `GET /v1/certs?version=<n>` | Layanan yang menerbitkan DAT |
| Mengambil sertifikat khusus verifikasi | `GET /v1/certs/verify-only?version=<n>` | Layanan yang hanya memverifikasi dan mendekripsi |
| Mendaftarkan sertifikat | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | Operator atau tugas pembuatan sertifikat |

Permintaan sertifikat lengkap dan khusus verifikasi dapat dilindungi dengan peran token yang berbeda. Atur opsi `verifyOnly` pada manajer klien agar layanan khusus verifikasi tidak meminta sertifikat lengkap.

## Kursor versi

Klien mengirim versi terakhir yang telah diterapkan kepada server. Jika keadaan server sama, sertifikat tidak perlu dikirim kembali. Jika ada keadaan baru, respons memuat versi pada baris pertama dan sertifikat mulai baris berikutnya.

Jika respons berhasil hanya memuat versi tanpa sertifikat, sertifikat dan penerbit yang ada tetap dipertahankan. Respons dengan versi server yang lebih rendah daripada versi klien diperlakukan sebagai kesalahan tanpa memundurkan keadaan.

## Aturan penerapan sertifikat

- Jika `cid` yang sama berulang dalam satu respons, seluruh respons ditolak.
- Jika `cid` pada respons baru sama dengan `cid` yang sudah dimiliki, sertifikat lama dipertahankan.
- Semua sertifikat di-parse dan divalidasi sebelum keadaan diterapkan sekaligus.
- Jangan menyisakan keadaan dengan hanya sebagian sertifikat yang berhasil diterapkan.
- Pilih sertifikat lengkap yang sesuai dari sertifikat yang dapat menerbitkan saat ini sebagai penerbit.

## Sinkronisasi awal dan manual

Sinkronisasi pertama saat membuat manajer klien biasanya bersifat best-effort. Jika gagal, manajer tetap dibuat dan kesalahan terakhir yang spesifik disimpan. Jika startup aplikasi harus gagal, panggil API sinkronisasi langsung pada masing-masing pustaka untuk meneruskan kesalahan kepada pemanggil.

Lingkungan yang tidak menggunakan sinkronisasi otomatis dapat menonaktifkan interval dan melakukan sinkronisasi manual saat diperlukan. Jika sinkronisasi otomatis digunakan, tutup atau hentikan manajer ketika aplikasi berakhir.

## Jaringan dan kesalahan

Atur timeout koneksi dan seluruh permintaan sesuai lingkungan operasi. Kebijakan pengalihan berbeda pada setiap runtime, jadi periksa dokumentasi pustaka. Saat ini, respons CMS non-2xx diklasifikasikan sebagai kesalahan `DAT_CMS_*` sesuai status HTTP dan tidak mempertahankan kode kesalahan rinci dari JSON server secara langsung.

Saat penyimpanan mengalami gangguan sementara, server dapat menyediakan snapshot sertifikat terakhir yang berhasil. Jika belum pernah ada snapshot yang berhasil, server merespons dengan `DAT_STORE_UNAVAILABLE`.

## Dokumentasi layanan

Deployment, basis data, token akses, dan konfigurasi runtime dijelaskan lebih lanjut dalam [panduan layanan DAT CMS](../svc/docker-saro-lab-dat-cms).

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
