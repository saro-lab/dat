# Vibe Coding dengan AI

## Contoh vibe coding

```
Terapkan DAT pada autentikasi sesi di web server ini.
Ini adalah access token terdistribusi seperti JWT, dan dokumennya ada di https://dat.saro.me/llms.txt
Baca dulu sebelum mulai. Unduh seluruh set dokumen llms ke folder docs/dat, lalu perbarui juga dokumen agent-nya.

- Proyek: Java Spring Boot, sedang memakai Spring Security
- Tujuan: mengganti sesi dengan DAT
- Server DAT-CMS: http://localhost:8088 - pindahkan ke properti
- Algoritma tanda tangan: HMAC-SHA512-MFS
- Algoritma enkripsi: IV-AES256-GCM
- Sisanya pakai nilai bawaan

Jangan mengarang API yang tidak ada di dokumen.
```


## Algoritma

### Tanda Tangan

| Algoritma | Keterangan |
| --- |---|
| `HMAC-SHA256-MFS`<br/>`HMAC-SHA384-MFS`<br/>`HMAC-SHA512-MFS` | · Berbasis hash<br/>· Kunci simetris<br/>· Cepat<br/>· [HMAC](https://en.wikipedia.org/wiki/HMAC) |
| `ECDSA-P256`<br/>`ECDSA-P384`<br/>`ECDSA-P521` | · Berbasis kurva eliptik<br/>· Kunci asimetris<br/>· Keamanan yang ditebus dengan kecepatan<br/>· [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) |

- Kecepatan HMAC jauh mengungguli yang lain, jadi bila yang penting hanyalah menahan serangan dari luar, HMAC-lah pilihannya.
- Berkat struktur kunci publiknya, ECDSA memungkinkan Anda memisahkan server penerbit dari server verifikator. Pada sistem berskala besar yang kewenangan dan perannya sudah terpisah dengan baik, penerapannya memperkuat keamanan terhadap serangan orang dalam.

### Enkripsi

| Nama | Panjang kunci |
| --- |---|
| `IV-AES128-GCM` | 128 bit |
| `IV-AES256-GCM` | 256 bit |

- Data yang dienkripsi DAT itu pendek, sehingga hampir tidak ada perbedaan terukur antara 128 bit dan 256 bit.
- AES praktis tidak memakan sumber daya, jadi 256 bit disarankan demi margin keamanan yang lebih lega.


## Server DAT-CMS

**[Pasang DAT-CMS](./svc/docker-saro-lab-dat-cms)**

DAT-CMS tidak wajib, tetapi pemasangannya sangat disarankan bila Anda perlu menyebarkan sertifikat ke beberapa server dan mengotomatiskan key rolling.

## Dokumen Selanjutnya

- [Apa itu DAT?](./intro) - latar belakang perancangan DAT
- [Spesifikasi DAT](./spec/dat) - format wire token
- [Semua Perpustakaan](./libs/) - pemasangan dan contoh per bahasa
