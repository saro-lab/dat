export const it = {
  label: 'Italiano', lang: 'it', link: '/it/',
  description: 'DAT (Distributed Access Token) — una specifica di token di accesso distribuito che definisce scadenza, area cifrata e rotazione delle chiavi basata su certificati come contratto di trasmissione.',
  menu_docs: 'Documentazione', menu_intro: 'Introduzione', menu_intro_index: 'Che cos’è DAT?', menu_intro_ai: 'Vibe coding con l’AI',
  menu_spec: 'Specifica', menu_spec_dat: 'DAT', menu_spec_cert: 'Certificati', menu_spec_cms: 'DAT CMS', menu_spec_errors: 'Codici di errore',
  err_impact_critical: 'Critico', err_impact_partial: 'Parziale', err_impact_none: 'Nessun impatto',
  err_retry_transient: 'Temporaneo', err_retry_permanent: 'Permanente', err_retry_state: 'Stato', err_suspect: 'Sospetto', error_handling: 'Gestione degli errori',
  menu_libs: 'Librerie', menu_libs_index: 'Tutte le librerie',
  libs_intro: 'Client ufficiali per più linguaggi, tutti basati sullo stesso protocollo binario. Seleziona un linguaggio per vedere comandi di installazione, esempi di base e configurazione dei certificati.',
  menu_svc: 'Servizi', menu_svc_cms: 'DAT CMS', menu_tool: 'Strumenti', menu_tool_bytes: 'Convertitore di byte', menu_tool_time: 'Convertitore di tempo Unix', menu_projects: 'Progetti',
  external_link: 'Si apre in una nuova scheda', nav_prev: 'Pagina precedente', nav_next: 'Pagina successiva',
  platform_support: 'Piattaforme supportate', download: 'Scarica', example: 'Esempio', manual_code: 'Implementazione manuale', repository: 'Repository', structure: 'Struttura',
  page_not_found: 'Pagina non trovata', copy_code: 'Copia codice', clear: 'Cancella',
  dat_cms: 'Servizio di gestione dei certificati DAT', deploy_cmd: 'Comando di esecuzione',
  api_check: 'Verifica API', server: 'Server', production: 'Produzione', debug: 'Debug', db: 'Database',
  dat_expire: 'Data di scadenza', dat_plain: 'Dati pubblici', dat_secure: 'Dati cifrati',
  gen: 'Genera', gen_count: 'Numero da generare', cert: 'Certificato DAT',
  cert_cron: 'Pianificazione della generazione dei certificati DAT (Cron)', cert_exp: 'Scadenza del certificato',
  cert_issue_delay: 'Ritardo di emissione del certificato', dat_issue_start: 'Inizio emissione DAT',
  dat_issue_dur: 'Periodo di emissione DAT', dat_ttl: 'TTL del DAT (durata)',
  gen_certs: 'Genera certificati DAT', sig: 'Firma', alg: 'Algoritmo', sig_alg: 'Algoritmo di firma', sig_key: 'Chiave di firma',
  crypto: 'Cifratura', crypto_alg: 'Algoritmo di cifratura', crypto_key: 'Chiave di cifratura',
  export_key_pair: 'Esporta coppia di chiavi (privata, pubblica)', export_verify_only: 'Esporta chiave di verifica (pubblica)',
  import_certs: 'Importa certificati DAT', mgr_certs: 'Gestisci certificati DAT', issue_dat: 'Emetti DAT', parse_dat: 'Analizza DAT',
  paste_cert: 'Incolla certificati DAT', paste_dat: 'Incolla DAT',
  expired: 'Scaduto', issue_over: 'Emissione terminata', not_issue_yet: 'Non ancora utilizzabile per l’emissione', verify_only: 'Solo verifica',
  access_control: 'Controllo degli accessi', master_token: 'Token master',
  master_token_desc: 'Genera certificati DAT e recupera la versione del server',
  full_cert_token: 'Token certificato completo', full_cert_token_desc: 'Recupera certificati completi (coppia di chiavi, chiave hash)',
  verify_cert_token: 'Token certificato di verifica', verify_cert_token_desc: 'Recupera certificati di sola verifica (solo chiave di verifica)',
  tool_bytes_title: 'Convertitore di byte, Base64 ed Hex', show_more_byte_tools: 'Mostra altri strumenti per byte',
  text: 'Testo', hash: 'Hash', upper: 'Maiuscolo', bytes: 'Byte',
  input_text: 'Inserisci testo', input_base64: 'Inserisci Base64', input_hex: 'Inserisci Hex', seconds: 'secondi',
  default: 'Predefinito', none: 'Nessuno', see: 'Vedi', error: 'Errore', ignored: 'Ignorato', log_file: 'File di log',
  username: 'Nome utente', password: 'Password', host: 'Host', port: 'Porta',
  plain_text: 'Testo pubblico', secure_text: 'Testo cifrato', plain_hex: 'Hex pubblico', secure_hex: 'Hex cifrato',
  kube_namespace: 'Namespace Kubernetes', sqlite_path: 'Percorso SQLite', api_cache: 'Cache API',
  alnum_only: 'Usa soltanto lettere e numeri',
  msg_parse_ok: 'Analisi riuscita', msg_plain_empty: 'I dati pubblici sono vuoti', msg_secure_empty: 'I dati cifrati sono vuoti',
  msg_mariadb: 'MariaDB è supportato tramite il protocollo MySQL.',
  err_unknown: 'Errore sconosciuto', err_invalid_utf8: 'Testo UTF-8 non valido',
  err_odd_hex: 'Hex di lunghezza dispari: l’ultimo carattere viene ignorato.', err_invalid_base64: 'Base64 non valido',
  err_cert_empty: 'L’elenco dei certificati è vuoto: incolla o genera certificati',
  err_select_cert: 'Prima genera e seleziona un certificato', err_cert_exists: 'Il certificato esiste già',
  err_cert_not_exist: 'Il certificato non esiste', err_cert_not_issuable: 'Il certificato non può emettere token',
  err_cert_expired: 'Il certificato è scaduto', err_invalid_token: 'Token non valido',
  err_invalid_issue_times: 'Tempi di emissione non validi (inizio, durata, TTL)',
  err_issue_begin_range: 'L’inizio dell’emissione deve essere compreso tra 0 e 253405000799999',
  err_issue_dur_range: 'Il periodo di emissione deve essere maggiore di 0 secondi',
  err_dat_ttl_range: 'Il TTL del DAT deve essere maggiore di 0',
  err_gen_count_range: 'Il numero da generare deve essere compreso tra 1 e 100',
  err_invalid_port: 'Numero di porta non valido', err_invalid_db_port: 'Numero di porta del database non valido',
  err_invalid_db_cache: 'Durata della cache del database non valida (0–3600)',
  err_invalid_cron: 'Espressione Cron non valida', err_invalid_delay: 'Ritardo di emissione non valido',
  err_invalid_issue_dur: 'Periodo di emissione DAT non valido', err_invalid_dat_ttl: 'TTL DAT non valido',
  err_invalid_kube_ns: 'Namespace Kubernetes non valido', err_invalid_kube_replicas: 'Numero di repliche Kubernetes non valido (1–12)',
  cms_certs: 'Certificati', cms_status: 'Stato', cms_debug_mode_only: 'Solo modalità debug', cms_binary: 'Binario',
  cms_opt_env: 'Opzioni (variabili d’ambiente)', cms_opt_hostname_desc: 'Usato solo nei nomi dei file di log',
  cms_opt_port_desc: 'Porta del servizio', cms_opt_db_uri_desc: 'URI del database', cms_supported: 'Supportato',
  cms_opt_debug_desc: 'Modalità debug', cms_opt_log_console_desc: 'Output della console', cms_no_out: 'Nessun output',
  cms_value: 'Valore', cms_log_text_desc: 'Usa un file di log testuale',
  cms_log_json_desc: 'Usa un file di log JSON (per ELK)', cms_no_log_file: 'Nessun file di log',
  cms_disabled: 'Disabilitato', cms_schedule: 'Pianificazione', cms_set_default_value: 'Imposta il valore predefinito',
  cms_k8s_multi_pods_example: 'Esempio Kubernetes con più pod', cms_ex: 'Esempio:',
  cms_help_cert_issue_delay: `
        Dopo la generazione di un certificato, l’emissione viene rinviata finché non è trascorso il ritardo configurato.<br/>
        Questo intervallo consente ai vari server del cluster di sincronizzare il nuovo certificato.<br/>
        Per esempio, DAT CMS crea il certificato A e i server 1 e 2 lo recuperano ogni 60 secondi.<br/>
        Se il server 1 lo recupera per primo ed emette un DAT mentre il server 2 non è ancora sincronizzato, il server 2 non può verificare né analizzare quel DAT.<br/>
        Impostando 180 secondi, il certificato non può emettere token per i primi 180 secondi dalla creazione.<br/>
        L’emissione inizia solo dopo tale intervallo, lasciando a tutti gli altri server il tempo di sincronizzarsi in sicurezza.<br/>
        Per considerare errori temporanei di rete, impostare un valore almeno tre o quattro volte superiore all’intervallo di sincronizzazione dei server.`,
  cms_help_dat_issue_dur: `
        È il periodo durante il quale il certificato può emettere DAT, a partire dal termine di <b>{cert_issue_delay}</b>.<br/>
        Alla fine di questo periodo il certificato non può più emettere nuovi DAT e può soltanto verificare e analizzare quelli già emessi.`,
  cms_help_dat_ttl: `
        È la durata di validità di un DAT emesso.<br/>
        Anche dopo la fine di <b>{cert_issue_delay}</b>, il certificato rimane disponibile per analisi e verifica per <b>{dat_ttl}</b>, così che i DAT già emessi conservino l’intera durata.<br/>
        Il certificato scade definitivamente quando sono trascorsi sia <b>{cert_issue_delay}</b> sia <b>{dat_ttl}</b>.`,
  cms_help_cert_cron: `
        Espressione Cron per generare periodicamente nuovi certificati.<br/>
        Considerare <b>{cert_issue_delay}</b> e <b>{dat_issue_dur}</b> per evitare un intervallo troppo lungo.<br/>
        Un intervallo troppo breve genera invece troppi certificati e spreca risorse sui server che li sincronizzano ed elaborano; scegliere quindi una frequenza operativa adeguata.`,
  bench_title: 'Prestazioni', bench_note: 'Misurato su Mac mini M4 base 2024 (10 core) · I grafici mostrano solo IV-AES256-GCM',
  bench_table: 'Dati originali (ms per 10.000 operazioni)', bench_issue: 'Emissione di 10.000 DAT',
  bench_parse: 'Analisi di 10.000 DAT', bench_multi: 'Multithread', bench_single: 'Thread singolo',
}
