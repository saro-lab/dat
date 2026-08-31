export const sw = {
  label: 'Kiswahili', lang: 'sw', link: '/sw/',
  description: 'DAT (Distributed Access Token) — kiwango cha tokeni ya ufikiaji iliyosambazwa kinachofafanua kuisha, eneo lililosimbwa kwa njia fiche na mabadiliko ya funguo kwa vyeti kama mkataba wa waya.',
  menu_docs: 'Hati', menu_intro: 'Utangulizi', menu_intro_index: 'DAT ni nini?', menu_intro_ai: 'Vibe coding kwa AI',
  menu_spec: 'Kiwango', menu_spec_dat: 'DAT', menu_spec_cert: 'Vyeti', menu_spec_cms: 'DAT CMS', menu_spec_errors: 'Misimbo ya makosa',
  err_impact_critical: 'Kubwa', err_impact_partial: 'Sehemu', err_impact_none: 'Hakuna athari', err_retry_transient: 'Muda mfupi', err_retry_permanent: 'Kudumu', err_retry_state: 'Hali', err_suspect: 'Ya kutiliwa shaka', error_handling: 'Ushughulikiaji wa makosa',
  menu_libs: 'Maktaba', menu_libs_index: 'Maktaba zote', libs_intro: 'Wateja rasmi wa lugha nyingi, wote wakitumia protokali ileile ya binary. Chagua lugha ili kuona amri za usakinishaji, mifano ya msingi na usanidi wa vyeti.',
  menu_svc: 'Huduma', menu_svc_cms: 'DAT CMS', menu_tool: 'Zana', menu_tool_bytes: 'Kigeuzi cha baiti', menu_tool_time: 'Kigeuzi cha wakati wa Unix', menu_projects: 'Miradi',
  external_link: 'Hufunguka katika kichupo kipya', nav_prev: 'Ukurasa uliopita', nav_next: 'Ukurasa unaofuata', platform_support: 'Majukwaa yanayotumika', download: 'Pakua', example: 'Mfano', manual_code: 'Utekelezaji wa mkono', repository: 'Hifadhi', structure: 'Muundo',
  page_not_found: 'Ukurasa haujapatikana', copy_code: 'Nakili msimbo', clear: 'Futa', dat_cms: 'Huduma ya usimamizi wa vyeti vya DAT', deploy_cmd: 'Amri ya utekelezaji', api_check: 'Ukaguzi wa API', server: 'Seva', production: 'Uzalishaji', debug: 'Utatuzi', db: 'Hifadhidata',
  dat_expire: 'Muda wa kuisha', dat_plain: 'Data wazi', dat_secure: 'Data iliyosimbwa kwa njia fiche', gen: 'Unda', gen_count: 'Idadi ya kuunda', cert: 'Cheti cha DAT', cert_cron: 'Ratiba ya kuunda vyeti vya DAT (Cron)', cert_exp: 'Kuisha kwa cheti', cert_issue_delay: 'Ucheleweshaji wa utoaji wa cheti', dat_issue_start: 'Mwanzo wa utoaji wa DAT', dat_issue_dur: 'Kipindi cha utoaji wa DAT', dat_ttl: 'DAT TTL (muda wa kuishi)',
  gen_certs: 'Unda vyeti vya DAT', sig: 'Sahihi', alg: 'Algoriti', sig_alg: 'Algoriti ya sahihi', sig_key: 'Ufunguo wa sahihi', crypto: 'Usimbaji fiche', crypto_alg: 'Algoriti ya usimbaji fiche', crypto_key: 'Ufunguo wa usimbaji fiche', export_key_pair: 'Hamisha jozi ya funguo (binafsi, umma)', export_verify_only: 'Hamisha ufunguo wa uthibitishaji (umma)',
  import_certs: 'Ingiza vyeti vya DAT', mgr_certs: 'Dhibiti vyeti vya DAT', issue_dat: 'Toa DAT', parse_dat: 'Changanua DAT', paste_cert: 'Bandika vyeti vya DAT', paste_dat: 'Bandika DAT', expired: 'Imeisha', issue_over: 'Utoaji umekwisha', not_issue_yet: 'Bado haiwezi kutumika kutoa', verify_only: 'Uthibitishaji pekee',
  access_control: 'Udhibiti wa ufikiaji', master_token: 'Tokeni kuu', master_token_desc: 'Huunda vyeti vya DAT na kupata toleo la seva', full_cert_token: 'Tokeni ya cheti kamili', full_cert_token_desc: 'Hupata vyeti kamili (jozi ya funguo, ufunguo wa hash)', verify_cert_token: 'Tokeni ya cheti cha uthibitishaji', verify_cert_token_desc: 'Hupata vyeti vya uthibitishaji pekee (ufunguo wa uthibitishaji tu)',
  tool_bytes_title: 'Kigeuzi cha baiti, Base64 na Hex', show_more_byte_tools: 'Onyesha zana zaidi za baiti', text: 'Maandishi', hash: 'Hash', upper: 'Herufi kubwa', bytes: 'Baiti', input_text: 'Ingiza maandishi', input_base64: 'Ingiza Base64', input_hex: 'Ingiza Hex', seconds: 'sekunde', default: 'Chaguo-msingi', none: 'Hakuna', see: 'Tazama', error: 'Kosa', ignored: 'Imepuuzwa', log_file: 'Faili la kumbukumbu',
  username: 'Jina la mtumiaji', password: 'Nenosiri', host: 'Mwenyeji', port: 'Porti', plain_text: 'Maandishi wazi', secure_text: 'Maandishi yaliyosimbwa kwa njia fiche', plain_hex: 'Hex wazi', secure_hex: 'Hex iliyosimbwa kwa njia fiche', kube_namespace: 'Namespace ya Kubernetes', sqlite_path: 'Njia ya SQLite', api_cache: 'Akiba ya API', alnum_only: 'Tumia herufi na namba pekee',
  msg_parse_ok: 'Uchanganuzi umefaulu', msg_plain_empty: 'Data wazi ni tupu', msg_secure_empty: 'Data iliyosimbwa kwa njia fiche ni tupu', msg_mariadb: 'MariaDB inatumika kupitia protokali ya MySQL.', err_unknown: 'Kosa lisilojulikana', err_invalid_utf8: 'Maandishi ya UTF-8 si sahihi', err_odd_hex: 'Hex yenye urefu witiri: herufi ya mwisho imepuuzwa.', err_invalid_base64: 'Base64 si sahihi',
  err_cert_empty: 'Orodha ya vyeti ni tupu: bandika au unda vyeti', err_select_cert: 'Kwanza unda na uchague cheti', err_cert_exists: 'Cheti kipo tayari', err_cert_not_exist: 'Cheti hakipo', err_cert_not_issuable: 'Cheti hakiwezi kutoa tokeni', err_cert_expired: 'Cheti kimeisha', err_invalid_token: 'Tokeni si sahihi', err_invalid_issue_times: 'Nyakati za utoaji si sahihi (mwanzo, kipindi, TTL)',
  err_issue_begin_range: 'Mwanzo wa utoaji lazima uwe kati ya 0 na 253405000799999', err_issue_dur_range: 'Kipindi cha utoaji lazima kiwe zaidi ya sekunde 0', err_dat_ttl_range: 'DAT TTL lazima iwe zaidi ya 0', err_gen_count_range: 'Idadi ya kuunda lazima iwe kati ya 1 na 100', err_invalid_port: 'Namba ya porti si sahihi', err_invalid_db_port: 'Namba ya porti ya hifadhidata si sahihi', err_invalid_db_cache: 'Muda wa akiba ya hifadhidata si sahihi (0–3600)',
  err_invalid_cron: 'Usemi wa Cron si sahihi', err_invalid_delay: 'Ucheleweshaji wa utoaji si sahihi', err_invalid_issue_dur: 'Kipindi cha utoaji wa DAT si sahihi', err_invalid_dat_ttl: 'DAT TTL si sahihi', err_invalid_kube_ns: 'Namespace ya Kubernetes si sahihi', err_invalid_kube_replicas: 'Idadi ya nakala za Kubernetes si sahihi (1–12)',
  cms_certs: 'Vyeti', cms_status: 'Hali', cms_debug_mode_only: 'Hali ya utatuzi pekee', cms_binary: 'Faili tekelezi', cms_opt_env: 'Chaguo (vigezo vya mazingira)', cms_opt_hostname_desc: 'Hutumika katika majina ya faili za kumbukumbu pekee', cms_opt_port_desc: 'Porti ya huduma', cms_opt_db_uri_desc: 'URI ya hifadhidata', cms_supported: 'Inatumika', cms_opt_debug_desc: 'Hali ya utatuzi', cms_opt_log_console_desc: 'Tokeo la konsoli', cms_no_out: 'Hakuna tokeo',
  cms_value: 'Thamani', cms_log_text_desc: 'Tumia faili la kumbukumbu la maandishi', cms_log_json_desc: 'Tumia faili la kumbukumbu la JSON (kwa ELK)', cms_no_log_file: 'Hakuna faili la kumbukumbu', cms_disabled: 'Imezimwa', cms_schedule: 'Ratiba', cms_set_default_value: 'Weka thamani chaguo-msingi', cms_k8s_multi_pods_example: 'Mfano wa Kubernetes wenye pod nyingi', cms_ex: 'Mfano:',
  cms_help_cert_issue_delay: `
        Baada ya kuunda cheti, utoaji huahirishwa hadi ucheleweshaji uliowekwa upite.<br/>
        Kipindi hiki huruhusu seva tofauti katika cluster kusawazisha cheti kipya.<br/>
        Kwa mfano, DAT CMS iunde cheti A na seva 1 na 2 zikichukue kila sekunde 60.<br/>
        Seva 1 ikikichukua kwanza na kutoa DAT kabla seva 2 haijasawazishwa, seva 2 haiwezi kuthibitisha wala kuchanganua DAT hiyo.<br/>
        Ukiweka sekunde 180, cheti hakiwezi kutoa tokeni kwa sekunde 180 za kwanza baada ya kuundwa.<br/>
        Utoaji huanza baada ya kipindi hicho, ukiipa kila seva nyingine muda wa kusawazisha kwa usalama.<br/>
        Ili kuzingatia hitilafu za muda za mtandao, weka thamani angalau mara tatu au nne ya kipindi cha usawazishaji wa seva.`,
  cms_help_dat_issue_dur: `
        Ni kipindi ambacho cheti kinaweza kutoa DAT baada ya <b>{cert_issue_delay}</b> kuisha.<br/>
        Kipindi hiki kikiisha cheti hakiwezi kutoa DAT mpya; kinaweza tu kuthibitisha na kuchanganua zilizotolewa tayari.`,
  cms_help_dat_ttl: `
        Ni muda ambao DAT iliyotolewa hubaki halali.<br/>
        Hata baada ya <b>{cert_issue_delay}</b> kuisha, cheti hubaki kwa uchanganuzi na uthibitishaji kwa <b>{dat_ttl}</b> ili DAT zilizotolewa zihifadhi muda wake wote.<br/>
        Cheti huisha kabisa baada ya jumla ya muda wa <b>{cert_issue_delay}</b> + <b>{dat_ttl}</b> kupita.`,
  cms_help_cert_cron: `
        Usemi wa Cron wa kuunda vyeti vipya mara kwa mara.<br/>
        Zingatia <b>{cert_issue_delay}</b> na <b>{dat_issue_dur}</b> ili kuepuka kipindi kirefu mno.<br/>
        Kipindi kifupi mno huunda vyeti vingi na kupoteza rasilimali za seva zinazovisawazisha na kuvichakata; chagua marudio yanayofaa kwa uendeshaji.`,
  bench_title: 'Utendaji', bench_note: 'Imepimwa kwenye Mac mini M4 ya msingi ya 2024 (cores 10) · Grafu zinaonyesha IV-AES256-GCM pekee', bench_table: 'Data ghafi (ms kwa operesheni 10,000)', bench_issue: 'Kutoa DAT 10,000', bench_parse: 'Kuchanganua DAT 10,000', bench_multi: 'Nyuzi nyingi', bench_single: 'Uzi mmoja',
}
