# DAT (Distributed Access Token)

---

## Latar Belakang Pengenalan DAT

Saat ini, banyak sistem mengadopsi JWT, namun keterbatasan struktural ada di lingkungan produksi nyata sebagai berikut.<br/>
Untuk menyelesaikan masalah ini, spesifikasi token baru, DAT, dirancang.

#### 🧩 Fragmentasi Spesifikasi Keamanan dan Kurangnya Penegakan

JWT menyediakan standar enkripsi seperti JWE, namun penggunaannya tidak diwajibkan. <br/>
Akibatnya, banyak lingkungan pengembangan mengabaikan enkripsi atau mentransmisikan data menggunakan metode non-standar, yang mengarah pada kerentanan keamanan.

#### 🔑 Risiko Keamanan dari Penggunaan Kunci Statis

Karena rolling kunci tanda tangan tidak diwajibkan, kunci tunggal sering digunakan dalam jangka waktu lama. Hal ini dapat menyebabkan runtuhnya keamanan sistem secara menyeluruh jika kunci dikompromikan; bahkan insiden pelanggaran yang disebabkan oleh hal ini telah terjadi di situs e-commerce berskala besar.

#### 📉 Penurunan Kinerja akibat Overhead

JWT melewati proses parsing JSON untuk setiap permintaan, yang mengonsumsi sumber daya CPU yang signifikan. Di lingkungan berkinerja tinggi, biaya parsing ini dapat menjadi bottleneck utama bagi seluruh sistem.


## Filosofi Inti DAT

DAT dirancang berdasarkan prinsip bahwa keamanan harus wajib bukan opsional, dan kinerja tidak dapat dikompromikan.

#### ⚡ Ringan dan Cepat

```expire```.```cid```.```plain```.```secure```.```signature```

DAT memiliki struktur data yang ringan seperti yang ditunjukkan di atas.

#### 🔐 Keamanan yang Ditegakkan

DAT secara fisik memisahkan wilayah teks biasa (Plain) dan **terenkripsi (Secure)** selama transmisi data.<br/>
Informasi sensitif diwajibkan untuk dienkripsi, dan seluruh proses dilindungi oleh algoritma standar (P256, AES-GCM, dll.) melalui `DatKey`.

#### 🔄 Key Rolling yang Ditegakkan

`DatKey`, inti dari sistem DAT, secara langsung mengelola **siklus hidup kunci** serta penerbitan dan kedaluwarsa token.<br/>
Dirancang untuk merotasi kunci secara berkala di tingkat sistem, secara fundamental mencegah 'insiden keamanan kunci statis' yang disebabkan oleh kelalaian administrator.

---

## Perbandingan Mekanisme Autentikasi

| Klasifikasi | **DAT** | **JWT** | **Session** |
| --- |-------------------------------| --- |---------------------------|
| **Metode Autentikasi** | **Verifikasi Terdistribusi** | Verifikasi Terdistribusi | Terpusat |
| **Struktur Data** | **Raw Bytes<br/>(Fixed Offset-Based)** | JSON<br/>(Key-Value Text-Based) | Serialized Object<br/>(Object Serialization) |
| **Mekanisme Parsing** | **Pemetaan Byte Data Langsung** | Memerlukan Parsing JSON dan Type Casting | Memerlukan Deserialisasi Objek dan I/O |
| **Kinerja Pemrosesan** | **Tertinggi (Overhead Parsing Minimal)** | Sedang (Bergantung pada Kinerja Pemrosesan JSON) | Rendah (Network/Disk I/O) |
| **Enkripsi** | **Bawaan** | Memerlukan Implementasi JWE Terpisah (Kompleks) | Tidak Berlaku |
| **Manajemen Kunci** | **Enforced System Rolling (Keamanan Dipaksakan)** | Memerlukan Implementasi Langsung (Risiko Manajemen Ceroboh) | Tidak Berlaku |
| **Masa Berlaku Kunci** | **Diwajibkan dan Eksplisit dalam Spesifikasi Kunci** | Opsional (Permanen jika Tidak Dikelola) | Dikelola oleh Server Pusat |
