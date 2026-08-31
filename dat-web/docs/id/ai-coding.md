# Vibe coding dengan AI

DAT dapat diterapkan dengan lebih mudah jika Anda menjelaskan proyek saat ini dan perilaku yang diinginkan kepada AI. Pada contoh berikut, cukup ubah alamat dan nama variabel lingkungan agar sesuai dengan proyek Anda.

## Implementasi sederhana

Gunakan permintaan ini ketika Anda ingin membuat struktur dasar dengan cepat.

```text
Saya menggunakan Kotlin dan Spring Boot.
Tambahkan autentikasi DAT ke Spring Security.

Pertama, baca https://dat.saro.me/llms.txt lalu periksa
spesifikasi DAT dan cara menggunakan pustaka resmi.

Verifikasi Bearer token pada header Authorization,
dan jika autentikasi berhasil, masukkan informasi pengguna ke SecurityContext.

Server ini tidak menerbitkan DAT; server hanya memverifikasinya.
Server harus mengambil sertifikat khusus verifikasi dari DAT CMS.

Cari terlebih dahulu alamat server CMS dan konfigurasi token di dalam proyek.
Jika tidak ditemukan, tanyakan kepada saya. Jangan membuat nilai sendiri.

Gunakan pustaka DAT resmi untuk Java/Kotlin dan terapkan
sesuai struktur proyek serta gaya kode yang sudah ada.
```

## Implementasi terperinci

Gunakan permintaan ini ketika Anda ingin menentukan metode autentikasi dan penanganan kesalahan secara tepat.

```text
Proyek ini menggunakan Kotlin, Spring Boot, dan Spring Security.
Periksa konfigurasi keamanan saat ini, lalu tambahkan autentikasi DAT.

Pertama, baca https://dat.saro.me/llms.txt lalu periksa
spesifikasi DAT, metode sinkronisasi sertifikat, dan API pustaka resmi.

Ketentuan implementasinya sebagai berikut.

- Baca DAT dari header Authorization: Bearer.
- Jika DAT tidak ada, lanjutkan sebagai permintaan anonim.
- Jika DAT tidak valid atau kedaluwarsa, respons dengan 401.
- Jika verifikasi berhasil, masukkan ID dan hak akses pengguna ke SecurityContext.
- Baca dari plain hanya nilai yang boleh diketahui publik.
- Baca ID dan hak akses pengguna dari data secure yang sudah diverifikasi.
- Server ini hanya memverifikasi, jadi gunakan sertifikat verify-only dari DAT CMS.
- Ambil alamat CMS dan token melalui variabel lingkungan.
- Jika sinkronisasi sertifikat gagal saat startup, gagalkan juga startup aplikasi.
- Perbarui sertifikat secara otomatis selama berjalan dan tutup manajer saat berhenti.
- Bedakan penyebab kegagalan melalui kode kesalahan DAT, bukan pesan kesalahan.
- Jangan mencatat DAT asli, token CMS, atau data pribadi ke log.

Pertama, periksa konfigurasi Spring Security serta struktur pengguna dan hak akses dalam proyek.
Jika alamat CMS, variabel lingkungan token, atau format data secure tidak dapat diketahui, tanyakan sebelum melakukan implementasi.
Gunakan hanya API publik dari pustaka DAT resmi untuk Java/Kotlin.

Sebelum mengubah kode, jelaskan secara singkat alur autentikasi dan berkas yang akan diubah.
```

## Contoh mana yang sebaiknya dipilih?

- Jika Anda ingin mulai dengan kode yang dapat dijalankan, gunakan **Implementasi sederhana**.
- Jika Anda memerlukan alur autentikasi untuk lingkungan produksi, gunakan **Implementasi terperinci**.

Jika AI mengajukan pertanyaan, mulailah dengan menjelaskan alamat CMS, nama variabel lingkungan yang memuat token, dan informasi pengguna yang disimpan dalam `secure`.
