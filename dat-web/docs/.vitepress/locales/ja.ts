export const ja = {
    label: '日本語',
    lang: 'ja',
    link: '/ja/',
    description: 'DAT (Distributed Access Token) — 有効期限、暗号化領域、証明書ベースの鍵ローテーションをワイヤ契約として定義する分散アクセストークン仕様。',

    menu_docs: 'ドキュメント', menu_intro: 'はじめに', menu_intro_index: 'DAT とは？', menu_intro_ai: 'AI バイブコーディング',
    menu_spec: '仕様', menu_spec_dat: 'DAT', menu_spec_cert: '証明書', menu_spec_cms: 'DAT CMS', menu_spec_errors: 'エラーコード',
    err_impact_critical: '致命的', err_impact_partial: '部分的', err_impact_none: '影響なし',
    err_retry_transient: '一時的', err_retry_permanent: '永続的', err_retry_state: '状態', err_suspect: '疑わしい', error_handling: 'エラー処理',
    menu_libs: 'ライブラリ', menu_libs_index: 'すべてのライブラリ',
    libs_intro: '同じバイナリプロトコル上に構築された複数言語向けの公式クライアントです。言語を選択すると、インストールコマンド、基本例、証明書設定を確認できます。',
    menu_svc: 'サービス', menu_svc_cms: 'DAT CMS', menu_tool: 'ツール', menu_tool_bytes: 'バイト変換', menu_tool_time: 'Unix 時間変換', menu_projects: 'プロジェクト',
    external_link: '新しいタブで開きます', nav_prev: '前のページ', nav_next: '次のページ',

    platform_support: '対応プラットフォーム', download: 'ダウンロード', example: '例', manual_code: '手動実装', repository: 'リポジトリ', structure: '構造',
    page_not_found: 'ページが見つかりません', copy_code: 'コードをコピー', clear: 'クリア',
    dat_cms: 'DAT 証明書管理サービス', deploy_cmd: '実行コマンド', api_check: 'API を確認', server: 'サーバー', production: '本番', debug: 'デバッグ', db: 'データベース',
    dat_expire: '有効期限', dat_plain: 'プレーンデータ', dat_secure: '暗号化データ',

    gen: '生成', gen_count: '生成数', cert: 'DAT 証明書', cert_cron: 'DAT 証明書生成スケジュール (Cron)', cert_exp: '証明書の有効期限',
    cert_issue_delay: '証明書の発行遅延', dat_issue_start: 'DAT 発行開始時刻', dat_issue_dur: 'DAT 発行期間', dat_ttl: 'DAT TTL (寿命)', gen_certs: 'DAT 証明書を生成',
    sig: '署名', alg: 'アルゴリズム', sig_alg: '署名アルゴリズム', sig_key: '署名鍵', crypto: '暗号化', crypto_alg: '暗号化アルゴリズム', crypto_key: '暗号化鍵',
    export_key_pair: '鍵ペア (private, public) をエクスポート', export_verify_only: '検証鍵 (public) をエクスポート', import_certs: 'DAT 証明書をインポート', mgr_certs: 'DAT 証明書を管理',
    issue_dat: 'DAT を発行', parse_dat: 'DAT を解析', paste_cert: 'DAT 証明書を貼り付け', paste_dat: 'DAT を貼り付け',
    expired: '失効', issue_over: '発行終了', not_issue_yet: 'まだ発行不可', verify_only: '検証専用',

    access_control: 'アクセス制御', master_token: 'Master トークン', master_token_desc: 'DAT 証明書の生成とサーバーバージョンの取得',
    full_cert_token: 'Full Cert トークン', full_cert_token_desc: 'Full (Pair Key, Hash Key) 証明書を取得', verify_cert_token: 'Verify Cert トークン', verify_cert_token_desc: 'Verify (Verify Key Only) 証明書を取得',

    tool_bytes_title: 'バイト、Base64、Hex 変換', show_more_byte_tools: 'さらにバイトツールを表示', text: 'テキスト', hash: 'ハッシュ', upper: '大文字', bytes: 'バイト',
    input_text: 'テキストを入力', input_base64: 'Base64 を入力', input_hex: 'Hex を入力', seconds: '秒',
    default: 'デフォルト', none: 'なし', see: '参照', error: 'エラー', ignored: '無視', log_file: 'ログファイル', username: 'ユーザー名', password: 'パスワード', host: 'ホスト', port: 'ポート',
    plain_text: 'プレーンテキスト', secure_text: '暗号化テキスト', plain_hex: 'プレーン Hex', secure_hex: '暗号化 Hex', kube_namespace: 'Kubernetes 名前空間', sqlite_path: 'SQLite パス', api_cache: 'API キャッシュ', alnum_only: '英数字のみ使用',

    msg_parse_ok: '解析に成功しました', msg_plain_empty: 'プレーンデータは空です', msg_secure_empty: '暗号化データは空です', msg_mariadb: 'MariaDB は MySQL プロトコル経由で対応します。',
    err_unknown: '不明なエラー', err_invalid_utf8: '無効な UTF-8 テキスト', err_odd_hex: '奇数長の Hex: 最後の文字は無視されます。', err_invalid_base64: '無効な Base64',
    err_cert_empty: '証明書リストが空です: 証明書を貼り付けるか生成してください', err_select_cert: 'まず証明書を生成して選択してください', err_cert_exists: '証明書はすでに存在します', err_cert_not_exist: '証明書が存在しません',
    err_cert_not_issuable: '証明書はトークンを発行できません', err_cert_expired: '証明書は失効しています', err_invalid_token: '無効なトークン',
    err_invalid_issue_times: '無効な発行時間 (Begin, Duration, TTL)', err_issue_begin_range: '発行開始時刻は 0 から 253405000799999 の範囲で指定してください', err_issue_dur_range: '発行期間は 0 秒より長くしてください',
    err_dat_ttl_range: 'DAT TTL は 0 より大きくしてください', err_gen_count_range: '生成数は 1 から 100 の範囲で指定してください', err_invalid_port: '無効なポート番号', err_invalid_db_port: '無効なデータベースポート番号',
    err_invalid_db_cache: '無効なデータベースキャッシュ時間 (0–3600)', err_invalid_cron: '無効な Cron 式', err_invalid_delay: '無効な発行遅延', err_invalid_issue_dur: '無効な DAT 発行期間', err_invalid_dat_ttl: '無効な DAT TTL',
    err_invalid_kube_ns: '無効な Kubernetes 名前空間', err_invalid_kube_replicas: '無効な Kubernetes replicas (1–12)',

    cms_certs: '証明書', cms_status: '状態', cms_debug_mode_only: 'デバッグモードのみ', cms_binary: 'バイナリ', cms_opt_env: 'オプション (環境変数)', cms_opt_hostname_desc: 'ログファイル名でのみ使用されます',
    cms_opt_port_desc: 'サービスポート', cms_opt_db_uri_desc: 'データベース URI', cms_supported: '対応', cms_opt_debug_desc: 'デバッグモード', cms_opt_log_console_desc: 'コンソール出力', cms_no_out: '出力なし', cms_value: '値',
    cms_log_text_desc: 'テキストログファイルを使用', cms_log_json_desc: 'JSON ログファイルを使用 (ELK 用)', cms_no_log_file: 'ログファイルなし', cms_disabled: '無効', cms_schedule: 'スケジュール', cms_set_default_value: 'デフォルト値を設定',
    cms_k8s_multi_pods_example: 'Kubernetes 複数 Pod の例', cms_ex: '例:',

    cms_help_cert_issue_delay: `
        証明書の生成後、設定した Delay が経過するまで発行を延期します。<br/>
        これにより、クラスタ内の複数サーバーが新しい証明書を同期する時間を確保できます。<br/>
        例えば CMS が証明書 A を作成し、サーバー 1 と 2 が 60 秒ごとに取得するとします。<br/>
        サーバー 1 が先に取得して証明書 A で DAT を発行し、サーバー 2 が未同期なら、サーバー 2 はその DAT を検証・解析できません。<br/>
        この値を 180 秒にすると、作成後 180 秒間は証明書が発行不可のままになります。<br/>
        180 秒後にのみ発行が始まるため、他の全サーバーが安全に同期できます。<br/>
        一時的なネットワーク障害などを見込み、各サーバーの同期間隔の 3〜4 倍以上に設定してください。`,
    cms_help_dat_issue_dur: `
        <b>{cert_issue_delay}</b> の経過後、証明書が DAT を発行できる期間です。<br/>
        この期間が終わると新しい DAT は発行できず、発行済み DAT の検証と解析にのみ使用できます。`,
    cms_help_dat_ttl: `
        発行された DAT の寿命です。<br/>
        証明書の <b>{cert_issue_delay}</b> 終了後も、発行済み DAT が完全な寿命を保てるよう、<b>{dat_ttl}</b> の間は証明書で解析と検証ができます。<br/>
        証明書は <b>{cert_issue_delay}</b> と <b>{dat_ttl}</b> の両方が経過した後に最終的に失効します。`,
    cms_help_cert_cron: `
        新しい証明書を定期的に生成する Cron 式です。<br/>
        設定した <b>{cert_issue_delay}</b> と <b>{dat_issue_dur}</b> を考慮し、間隔が長すぎないようにします。<br/>
        逆に間隔が短すぎると不要な証明書が頻繁に生成され、同期・処理する連携サーバーのリソースを消費するため、適切な運用間隔を選びます。`,
    bench_title: 'パフォーマンス', bench_note: '2024 Mac mini M4 ベースモデル (10 コア) で測定 · グラフは IV-AES256-GCM のみ',
    bench_table: '生データ (10,000 回の操作あたり ms)', bench_issue: 'DAT を 10,000 回発行', bench_parse: 'DAT を 10,000 回解析', bench_multi: 'マルチスレッド', bench_single: 'シングルスレッド',
}
