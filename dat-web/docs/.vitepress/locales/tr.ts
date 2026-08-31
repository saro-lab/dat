export const tr = {
  label: 'Türkçe', lang: 'tr', link: '/tr/',
  description: 'DAT (Distributed Access Token) — sona ermeyi, şifreli alanı ve sertifika tabanlı anahtar değişimini bir aktarım sözleşmesi olarak tanımlayan dağıtık erişim tokenı standardı.',
  menu_docs: 'Belgeler', menu_intro: 'Giriş', menu_intro_index: 'DAT nedir?', menu_intro_ai: 'AI ile vibe coding',
  menu_spec: 'Standart', menu_spec_dat: 'DAT', menu_spec_cert: 'Sertifikalar', menu_spec_cms: 'DAT CMS', menu_spec_errors: 'Hata kodları',
  err_impact_critical: 'Kritik', err_impact_partial: 'Kısmi', err_impact_none: 'Etki yok',
  err_retry_transient: 'Geçici', err_retry_permanent: 'Kalıcı', err_retry_state: 'Durum', err_suspect: 'Şüpheli', error_handling: 'Hata işleme',
  menu_libs: 'Kütüphaneler', menu_libs_index: 'Tüm kütüphaneler',
  libs_intro: 'Aynı ikili protokolü temel alan çok sayıda dil için resmî istemciler. Kurulum komutlarını, temel örnekleri ve sertifika ayarlarını görmek için bir dil seçin.',
  menu_svc: 'Servisler', menu_svc_cms: 'DAT CMS', menu_tool: 'Araçlar', menu_tool_bytes: 'Bayt dönüştürücü', menu_tool_time: 'Unix zamanı dönüştürücü', menu_projects: 'Projeler',
  external_link: 'Yeni sekmede açılır', nav_prev: 'Önceki sayfa', nav_next: 'Sonraki sayfa',
  platform_support: 'Desteklenen platformlar', download: 'İndir', example: 'Örnek', manual_code: 'Elle uygulama', repository: 'Depo', structure: 'Yapı',
  page_not_found: 'Sayfa bulunamadı', copy_code: 'Kodu kopyala', clear: 'Temizle',
  dat_cms: 'DAT sertifika yönetim servisi', deploy_cmd: 'Çalıştırma komutu', api_check: 'API denetimi', server: 'Sunucu', production: 'Üretim', debug: 'Hata ayıklama', db: 'Veritabanı',
  dat_expire: 'Sona erme zamanı', dat_plain: 'Açık veri', dat_secure: 'Şifreli veri', gen: 'Oluştur', gen_count: 'Oluşturma sayısı', cert: 'DAT sertifikası',
  cert_cron: 'DAT sertifikası oluşturma zamanlaması (Cron)', cert_exp: 'Sertifikanın sona ermesi', cert_issue_delay: 'Sertifika verme gecikmesi', dat_issue_start: 'DAT verme başlangıcı',
  dat_issue_dur: 'DAT verme süresi', dat_ttl: 'DAT TTL (yaşam süresi)', gen_certs: 'DAT sertifikaları oluştur', sig: 'İmza', alg: 'Algoritma', sig_alg: 'İmza algoritması', sig_key: 'İmza anahtarı',
  crypto: 'Şifreleme', crypto_alg: 'Şifreleme algoritması', crypto_key: 'Şifreleme anahtarı',
  export_key_pair: 'Anahtar çiftini dışa aktar (özel, açık)', export_verify_only: 'Doğrulama anahtarını dışa aktar (açık)',
  import_certs: 'DAT sertifikalarını içe aktar', mgr_certs: 'DAT sertifikalarını yönet', issue_dat: 'DAT ver', parse_dat: 'DAT ayrıştır', paste_cert: 'DAT sertifikalarını yapıştır', paste_dat: 'DAT yapıştır',
  expired: 'Süresi doldu', issue_over: 'Token verme sona erdi', not_issue_yet: 'Token verme için henüz kullanılamaz', verify_only: 'Yalnızca doğrulama',
  access_control: 'Erişim denetimi', master_token: 'Ana token', master_token_desc: 'DAT sertifikaları oluşturur ve sunucu sürümünü alır',
  full_cert_token: 'Tam sertifika tokenı', full_cert_token_desc: 'Tam sertifikaları alır (anahtar çifti, özet anahtarı)', verify_cert_token: 'Doğrulama sertifikası tokenı', verify_cert_token_desc: 'Yalnızca doğrulama sertifikalarını alır (yalnızca doğrulama anahtarı)',
  tool_bytes_title: 'Bayt, Base64 ve Hex dönüştürücü', show_more_byte_tools: 'Daha fazla bayt aracı göster', text: 'Metin', hash: 'Özet', upper: 'Büyük harf', bytes: 'Bayt',
  input_text: 'Metin girin', input_base64: 'Base64 girin', input_hex: 'Hex girin', seconds: 'saniye', default: 'Varsayılan', none: 'Yok', see: 'Gör', error: 'Hata', ignored: 'Yok sayıldı', log_file: 'Günlük dosyası',
  username: 'Kullanıcı adı', password: 'Parola', host: 'Ana makine', port: 'Bağlantı noktası', plain_text: 'Açık metin', secure_text: 'Şifreli metin', plain_hex: 'Açık Hex', secure_hex: 'Şifreli Hex',
  kube_namespace: 'Kubernetes ad alanı', sqlite_path: 'SQLite yolu', api_cache: 'API önbelleği', alnum_only: 'Yalnızca harf ve rakam kullanın',
  msg_parse_ok: 'Ayrıştırma başarılı', msg_plain_empty: 'Açık veri boş', msg_secure_empty: 'Şifreli veri boş', msg_mariadb: 'MariaDB, MySQL protokolü üzerinden desteklenir.',
  err_unknown: 'Bilinmeyen hata', err_invalid_utf8: 'Geçersiz UTF-8 metni', err_odd_hex: 'Tek uzunlukta Hex: son karakter yok sayılır.', err_invalid_base64: 'Geçersiz Base64',
  err_cert_empty: 'Sertifika listesi boş: sertifika yapıştırın veya oluşturun', err_select_cert: 'Önce bir sertifika oluşturup seçin', err_cert_exists: 'Sertifika zaten var', err_cert_not_exist: 'Sertifika yok', err_cert_not_issuable: 'Sertifika token veremez',
  err_cert_expired: 'Sertifikanın süresi doldu', err_invalid_token: 'Geçersiz token', err_invalid_issue_times: 'Geçersiz token verme zamanları (başlangıç, süre, TTL)',
  err_issue_begin_range: 'Token verme başlangıcı 0 ile 253405000799999 arasında olmalıdır', err_issue_dur_range: 'Token verme süresi 0 saniyeden büyük olmalıdır', err_dat_ttl_range: 'DAT TTL 0’dan büyük olmalıdır', err_gen_count_range: 'Oluşturma sayısı 1 ile 100 arasında olmalıdır',
  err_invalid_port: 'Geçersiz bağlantı noktası numarası', err_invalid_db_port: 'Geçersiz veritabanı bağlantı noktası numarası', err_invalid_db_cache: 'Geçersiz veritabanı önbellek süresi (0–3600)',
  err_invalid_cron: 'Geçersiz Cron ifadesi', err_invalid_delay: 'Geçersiz token verme gecikmesi', err_invalid_issue_dur: 'Geçersiz DAT verme süresi', err_invalid_dat_ttl: 'Geçersiz DAT TTL',
  err_invalid_kube_ns: 'Geçersiz Kubernetes ad alanı', err_invalid_kube_replicas: 'Geçersiz Kubernetes replika sayısı (1–12)',
  cms_certs: 'Sertifikalar', cms_status: 'Durum', cms_debug_mode_only: 'Yalnızca hata ayıklama modu', cms_binary: 'İkili dosya', cms_opt_env: 'Seçenekler (ortam değişkenleri)', cms_opt_hostname_desc: 'Yalnızca günlük dosyası adlarında kullanılır',
  cms_opt_port_desc: 'Servis bağlantı noktası', cms_opt_db_uri_desc: 'Veritabanı URI’si', cms_supported: 'Desteklenir', cms_opt_debug_desc: 'Hata ayıklama modu', cms_opt_log_console_desc: 'Konsol çıktısı', cms_no_out: 'Çıktı yok',
  cms_value: 'Değer', cms_log_text_desc: 'Metin günlük dosyası kullanır', cms_log_json_desc: 'JSON günlük dosyası kullanır (ELK için)', cms_no_log_file: 'Günlük dosyası yok',
  cms_disabled: 'Devre dışı', cms_schedule: 'Zamanlama', cms_set_default_value: 'Varsayılan değeri ayarla', cms_k8s_multi_pods_example: 'Çok podlu Kubernetes örneği', cms_ex: 'Örnek:',
  cms_help_cert_issue_delay: `
        Bir sertifika oluşturulduktan sonra token verme işlemi, ayarlanan gecikme geçene kadar ertelenir.<br/>
        Bu aralık, kümedeki farklı sunucuların yeni sertifikayı eşitlemesine olanak tanır.<br/>
        Örneğin DAT CMS A sertifikasını oluştursun ve sunucu 1 ile 2 sertifikayı her 60 saniyede bir alsın.<br/>
        Sunucu 1 sertifikayı önce alıp DAT verirken sunucu 2 henüz eşitlenmemişse sunucu 2 bu DAT'yi doğrulayamaz veya ayrıştıramaz.<br/>
        Değer 180 saniye olarak ayarlanırsa sertifika, oluşturulduktan sonraki ilk 180 saniye boyunca token veremez.<br/>
        Token verme ancak bu aralıktan sonra başlar ve diğer tüm sunuculara güvenle eşitleme zamanı tanır.<br/>
        Geçici ağ hatalarını hesaba katmak için sunucuların eşitleme aralığının en az üç veya dört katı bir değer ayarlayın.`,
  cms_help_dat_issue_dur: `
        Sertifikanın <b>{cert_issue_delay}</b> bittikten sonra DAT verebildiği süredir.<br/>
        Bu sürenin sonunda sertifika yeni DAT veremez; yalnızca daha önce verilenleri doğrulayıp ayrıştırabilir.`,
  cms_help_dat_ttl: `
        Verilen bir DAT'nin geçerli kaldığı süredir.<br/>
        <b>{cert_issue_delay}</b> bittikten sonra bile sertifika, daha önce verilen DAT'lerin tüm ömrü korunsun diye <b>{dat_ttl}</b> boyunca ayrıştırma ve doğrulama için kullanılabilir kalır.<br/>
        Sertifikanın süresi, <b>{cert_issue_delay}</b> + <b>{dat_ttl}</b> toplam süresi geçtikten sonra tamamen dolar.`,
  cms_help_cert_cron: `
        Yeni sertifikaları düzenli olarak oluşturan Cron ifadesi.<br/>
        Aralığın çok uzun olmaması için <b>{cert_issue_delay}</b> ve <b>{dat_issue_dur}</b> değerlerini hesaba katın.<br/>
        Çok kısa bir aralık ise gereğinden fazla sertifika oluşturur ve bunları eşitleyip işleyen sunucularda kaynak harcar; bu nedenle işletime uygun bir sıklık seçin.`,
  bench_title: 'Performans', bench_note: '2024 temel Mac mini M4 (10 çekirdek) üzerinde ölçüldü · Grafikler yalnızca IV-AES256-GCM gösterir', bench_table: 'Ham veri (10.000 işlem başına ms)', bench_issue: '10.000 DAT verme', bench_parse: '10.000 DAT ayrıştırma', bench_multi: 'Çok iş parçacıklı', bench_single: 'Tek iş parçacığı',
}
