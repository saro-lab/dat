import type { SharedGuideLocale } from './types'

export const idGuideLocale: SharedGuideLocale = {
  libraryIndex: {
    title: 'Pustaka',
    intro: 'Pilih klien DAT untuk bahasa aplikasi Anda. Setiap klien menggunakan spesifikasi DAT dan sertifikat yang sama, serta menyediakan pengelolaan sertifikat lokal dan sinkronisasi DAT CMS.',
    criteriaTitle: 'Cara memilih',
    criteriaBody: 'Layanan yang menerbitkan DAT harus dapat menggunakan sertifikat lengkap. Layanan yang hanya memverifikasi dan mendekripsi sebaiknya menggunakan sertifikat ECDSA khusus verifikasi dan peran verify-only CMS.',
    flowTitle: 'Struktur panduan',
    flowBody: 'Setiap panduan pustaka membahas instalasi, alur penerbitan dan verifikasi paling sederhana, koneksi DAT CMS, kebijakan sinkronisasi, penghentian, dan penanganan kesalahan.',
  },
  library: {
    titleSuffix: 'Pustaka',
    install: 'Instalasi',
    quickTitle: 'Mulai cepat',
    quickIntro: 'Alur lengkap ini mengambil sertifikat dari CMS, membuat DAT berisi data JSON, lalu memverifikasinya.',
    stepTitle: 'Langkah demi langkah',
    connectTitle: '1. Hubungkan ke CMS',
    connectBody: 'Layanan penerbit menggunakan token untuk sertifikat lengkap. Sinkronisasi langsung saat startup mencegah penerbitan sebelum sertifikat tersedia.',
    issueTitle: '2. Terbitkan DAT',
    issueBody: 'Contoh ini menaruh JSON publik di `plain` dan informasi pengguna terlindungi dalam bentuk JSON di `secure`.',
    parseTitle: '3. Verifikasi DAT',
    parseBody: '`parse` memeriksa kedaluwarsa dan tanda tangan, lalu mendekripsi `secure`. Gunakan hanya payload yang dikembalikan setelah verifikasi berhasil.',
    functionsTitle: 'Fungsi utama',
    functionHeader: 'Fungsi',
    purposeHeader: 'Tujuan',
    dataTitle: 'Area data',
    plainBody: 'byte yang ditandatangani tetapi tidak dienkripsi.',
    secureBody: 'byte terenkripsi.',
    payloadBody: 'percayai hanya setelah `parse` berhasil.',
    optionsTitle: 'Pilihan selain JSON',
    optionsBody: 'Contoh menggunakan JSON yang umum. Untuk pemrosesan lebih cepat, data biner dapat menghindari serialisasi dan parsing JSON sekaligus mengurangi ukuran data.',
    formatsBody: 'Simpan nilai sederhana sebagai teks, atau taruh data terstruktur dalam format biner seperti Protobuf atau MessagePack di `plain` dan `secure`.',
    verifyTitle: 'Layanan khusus verifikasi',
    verifyBody: 'Layanan yang tidak menerbitkan DAT menggunakan opsi verify-only dan token verify-only, serta hanya memanggil `parse`.',
    lifecycleTitle: 'Penghentian dan kesalahan',
    errorsBefore: 'Gunakan ',
    errorsLink: 'kode kesalahan dan klasifikasi percobaan ulang',
    errorsAfter: ' sebagai pengganti pesan kesalahan.',
  },
  guides: {
    rust: {
      binaryNote: 'Karena `issue` saat ini menerima string, enkode byte sembarang sebagai Base64Url atau Hex, lalu dekode kembali setelah verifikasi.',
      lifecycle: 'Tugas sinkronisasi otomatis berakhir saat `Arc<DatCmsManager>` terakhir di-drop.',
      apiPurposes: ['Menyinkronkan sertifikat dengan segera.', 'Membuat DAT dengan sertifikat penerbit saat ini.', 'Memverifikasi DAT dan mengembalikan payload-nya.', 'Mengembalikan kesalahan sinkronisasi terakhir.'],
    },
    java: {
      binaryNote: 'Overload `ByteArray` menyimpan dan mengambil byte secara langsung tanpa format tambahan.',
      lifecycle: '`DatCmsManager` adalah `AutoCloseable`; tutup dengan `use` atau `close()`.',
      apiPurposes: ['Menyinkronkan sertifikat segera dan melaporkan kegagalan.', 'Membuat DAT dan mengembalikan DatResult.', 'Memverifikasi DAT dan mengembalikan Payload.', 'Mengembalikan kesalahan sinkronisasi latar belakang terakhir.'],
    },
    javascript: {
      binaryNote: 'Berikan `Uint8Array` atau `ArrayBuffer`, lalu ambil byte asli melalui `plainBytes` dan `secureBytes`.',
      lifecycle: 'Panggil `stop()` saat penghentian untuk membersihkan timer dan permintaan yang sedang berjalan.',
      apiPurposes: ['Menyinkronkan sertifikat dengan segera.', 'Membuat string DAT secara asinkron.', 'Memverifikasi DAT dan mengembalikan DatPayload.', 'Mengembalikan kesalahan sinkronisasi terakhir.'],
    },
    python: {
      binaryNote: 'Berikan `bytes` secara langsung dan ambil melalui `plain_bytes` dan `secure_bytes`.',
      lifecycle: 'Saat sinkronisasi otomatis aktif, panggil `stop()` ketika berhenti.',
      apiPurposes: ['Menyinkronkan sertifikat dengan segera.', 'Membuat string DAT.', 'Memverifikasi DAT dan mengembalikan DatPayload.', 'Mengembalikan kesalahan sinkronisasi terakhir.'],
    },
    csharp: {
      binaryNote: 'Gunakan overload `byte[]` serta `PlainBytes` dan `SecureBytes`.',
      lifecycle: 'Gunakan `await using` untuk membersihkan manajer dan sinkronisasi latar belakang.',
      apiPurposes: ['Menyinkronkan sertifikat dengan segera.', 'Membuat string DAT.', 'Memverifikasi DAT dan mengembalikan Payload.', 'Mengembalikan kesalahan sinkronisasi terakhir.'],
    },
    go: {
      binaryNote: 'String Go dapat memuat byte. Berikan slice byte sebagai `string`, lalu konversi hasilnya kembali menjadi `[]byte`.',
      lifecycle: 'Saat sinkronisasi otomatis aktif, gunakan `defer cms.Close()` untuk menjamin pembersihan.',
      apiPurposes: ['Menyinkronkan sertifikat dengan segera.', 'Mengembalikan string DAT dan kesalahan.', 'Mengembalikan Payload terverifikasi dan kesalahan.', 'Mengembalikan kesalahan sinkronisasi terakhir.'],
    },
    ruby: {
      binaryNote: 'Berikan string biner dan ambil kembali melalui `plain_bytes` dan `secure_bytes`.',
      lifecycle: 'Saat sinkronisasi otomatis aktif, panggil `stop` untuk mengakhiri thread latar belakang.',
      apiPurposes: ['Menyinkronkan sertifikat dengan segera.', 'Membuat string DAT.', 'Memverifikasi DAT dan mengembalikan DatPayload.', 'Mengembalikan kesalahan sinkronisasi terakhir.'],
    },
    c: {
      binaryNote: 'API penerbitan C saat ini menerima string yang diakhiri NUL. Enkode byte sembarang sebagai Base64Url atau Hex, lalu baca hasil menggunakan panjang payload.',
      lifecycle: 'Bebaskan `dat`, `payload`, dan `cms` dengan fungsi pembersihan masing-masing.',
      apiPurposes: ['Menyinkronkan sertifikat dengan segera.', 'Mengalokasikan dan mengembalikan string DAT.', 'Mengalokasikan dan mengembalikan payload terverifikasi.', 'Mengembalikan kesalahan sinkronisasi terakhir.'],
      parse: `dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);
/* Gunakan plain_bytes dan secure_bytes dengan panjangnya masing-masing. */`,
      binary: `/* Enkode dahulu data yang memuat NUL karena issue menerima string C. */
const char *secure_hex = "00ff1080";
char *dat = NULL;
err = dat_cms_manager_issue(cms, "01", secure_hex, &dat);

dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);`,
    },
  },
  cms: {
    introBefore: 'DAT CMS membuat sertifikat, menyimpannya dalam basis data, dan mengirim sertifikat yang sesuai kepada layanan penerbit dan pemverifikasi. Perilaku protokol dijelaskan dalam ',
    specLink: 'spesifikasi DAT CMS',
    introAfter: '.',
    configTitle: 'Buat konfigurasi runtime',
    dockerTitle: 'Jalankan dengan Docker',
    dockerBody: 'Jalankan container sebagai pengguna non-root. Saat menggunakan SQLite, mount direktori data yang dapat ditulis. Berikan token dan kata sandi basis data melalui mekanisme injeksi secret, bukan riwayat perintah.',
    databaseTitle: 'Basis data',
    databaseBody1: 'Gunakan `DB_URI` untuk mengatur koneksi SQLite, PostgreSQL, atau MySQL. MariaDB terhubung melalui protokol MySQL. CMS menyimpan hasil kueri sertifikat sebagai snapshot dalam cache dan tetap melayani snapshot berhasil terakhir ketika refresh penyimpanan gagal sementara.',
    databaseBody2: '`DB_CACHE_SECS` mengatur interval refresh snapshot, sedangkan `DB_QUERY_TIMEOUT_SECS` membatasi kueri refresh. Jika belum ada snapshot berhasil dan penyimpanan tidak dapat dibaca, layanan mengembalikan `DAT_STORE_UNAVAILABLE`.',
    rolesTitle: 'Peran akses',
    roleHeaders: ['Variabel lingkungan', 'Izin', 'Digunakan oleh'],
    roleRows: [
      ['Mendaftarkan sertifikat dan mengambil versi terlindungi', 'Operasi'],
      ['Mengambil sertifikat lengkap', 'Layanan penerbit DAT'],
      ['Mengambil sertifikat khusus verifikasi', 'Layanan verifikasi dan dekripsi'],
    ],
    rolesNote: 'Setiap variabel menerima token alfanumerik yang dipisahkan koma. Jika daftar token suatu peran kosong, endpoint peran tersebut dibuka dan peringatan dicatat.',
    certificateTitle: 'Pembuatan sertifikat',
    certificateBody: 'Peran master mendaftarkan sertifikat dengan menentukan algoritme tanda tangan, algoritme enkripsi, penundaan propagasi, periode penerbitan, dan TTL. Selama penundaan propagasi, layanan menyinkronkan sertifikat baru sebelum sertifikat dapat menerbitkan.',
    clientTitle: 'Integrasi klien',
    clientSteps: [
      'Gunakan token lengkap dan endpoint sertifikat lengkap untuk layanan penerbit.',
      'Gunakan token verifikasi dan opsi verify-only untuk layanan pemverifikasi.',
      'Periksa hasil sinkronisasi pertama; jika startup harus gagal, panggil API sinkronisasi langsung.',
      'Saat sinkronisasi otomatis aktif, tutup manajer ketika aplikasi berhenti.',
    ],
    libraryBefore: 'Lihat ',
    libraryLink: 'panduan pustaka',
    libraryAfter: ' untuk perilaku builder dan penghentian tiap bahasa.',
    operationsTitle: 'Pemeriksaan operasional',
    operationsItems: [
      '`/health` dan `/version/api` melaporkan status tanpa autentikasi.',
      '`/version` memerlukan master token jika peran tersebut dikonfigurasi.',
      'Kumpulkan log dari output standar dan error standar.',
      'Teruskan sinyal penghentian dan beri waktu bagi basis data serta scheduler untuk berhenti.',
    ],
    kubernetesTitle: 'Kubernetes',
    kubernetesBody: 'Samakan port container dan probe dengan port layanan, lalu mount direktori data dengan akses tulis untuk pengguna non-root. Injeksi token dan detail koneksi basis data melalui Secrets.',
  },
}
