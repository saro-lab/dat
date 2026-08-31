export const zh = {
    label: '中文', lang: 'zh', link: '/zh/',
    description: 'DAT (Distributed Access Token) — 一种将有效期、加密区域和基于证书的密钥轮换定义为线路契约的分布式访问令牌规范。',

    menu_docs: '文档', menu_intro: '介绍', menu_intro_index: '什么是 DAT？', menu_intro_ai: 'AI 氛围编程',
    menu_spec: '规范', menu_spec_dat: 'DAT', menu_spec_cert: '证书', menu_spec_cms: 'DAT CMS', menu_spec_errors: '错误代码',
    err_impact_critical: '严重', err_impact_partial: '部分', err_impact_none: '无影响', err_retry_transient: '短暂', err_retry_permanent: '永久', err_retry_state: '状态', err_suspect: '可疑', error_handling: '错误处理',
    menu_libs: '库', menu_libs_index: '所有库', libs_intro: '针对多种语言的官方客户端，均基于同一二进制协议构建。选择一种语言，可查看该客户端的安装命令、基本示例和证书配置。',
    menu_svc: '服务', menu_svc_cms: 'DAT CMS', menu_tool: '工具', menu_tool_bytes: '字节转换器', menu_tool_time: 'Unix 时间转换器', menu_projects: '项目',
    external_link: '在新标签页中打开', nav_prev: '上一页', nav_next: '下一页',

    platform_support: '支持的平台', download: '下载', example: '示例', manual_code: '手动实现', repository: '代码库', structure: '结构', page_not_found: '未找到页面', copy_code: '复制代码', clear: '清除',
    dat_cms: 'DAT 证书管理服务', deploy_cmd: '运行命令', api_check: '检查 API', server: '服务器', production: '生产', debug: '调试', db: '数据库',
    dat_expire: '过期时间', dat_plain: '明文数据', dat_secure: '加密数据',

    gen: '生成', gen_count: '生成数量', cert: 'DAT 证书', cert_cron: 'DAT 证书生成计划 (Cron)', cert_exp: '证书过期', cert_issue_delay: '证书签发延迟',
    dat_issue_start: 'DAT 签发开始时间', dat_issue_dur: 'DAT 签发期间', dat_ttl: 'DAT TTL (寿命)', gen_certs: '生成 DAT 证书',
    sig: '签名', alg: '算法', sig_alg: '签名算法', sig_key: '签名密钥', crypto: '加密', crypto_alg: '加密算法', crypto_key: '加密密钥',
    export_key_pair: '导出密钥对 (private, public)', export_verify_only: '导出验证密钥 (public)', import_certs: '导入 DAT 证书', mgr_certs: '管理 DAT 证书', issue_dat: '签发 DAT', parse_dat: '解析 DAT', paste_cert: '粘贴 DAT 证书', paste_dat: '粘贴 DAT',
    expired: '已过期', issue_over: '签发已结束', not_issue_yet: '尚不可签发', verify_only: '仅验证',

    access_control: '访问控制', master_token: 'Master 令牌', master_token_desc: '生成 DAT 证书并获取服务器版本',
    full_cert_token: 'Full Cert 令牌', full_cert_token_desc: '获取 Full (Pair Key, Hash Key) 证书', verify_cert_token: 'Verify Cert 令牌', verify_cert_token_desc: '获取 Verify (Verify Key Only) 证书',

    tool_bytes_title: '字节、Base64 和 Hex 转换器', show_more_byte_tools: '显示更多字节工具', text: '文本', hash: '哈希', upper: '大写', bytes: '字节', input_text: '输入文本', input_base64: '输入 Base64', input_hex: '输入 Hex', seconds: '秒',
    default: '默认', none: '无', see: '参见', error: '错误', ignored: '已忽略', log_file: '日志文件', username: '用户名', password: '密码', host: '主机', port: '端口',
    plain_text: '明文文本', secure_text: '加密文本', plain_hex: '明文 Hex', secure_hex: '加密 Hex', kube_namespace: 'Kubernetes 命名空间', sqlite_path: 'SQLite 路径', api_cache: 'API 缓存', alnum_only: '仅使用字母和数字',

    msg_parse_ok: '解析成功', msg_plain_empty: '明文数据为空', msg_secure_empty: '加密数据为空', msg_mariadb: 'MariaDB 通过 MySQL 协议受支持。',
    err_unknown: '未知错误', err_invalid_utf8: '无效的 UTF-8 文本', err_odd_hex: '奇数长度 Hex：最后一个字符将被忽略。', err_invalid_base64: '无效的 Base64',
    err_cert_empty: '证书列表为空：请粘贴或生成证书', err_select_cert: '请先生成并选择证书', err_cert_exists: '证书已存在', err_cert_not_exist: '证书不存在', err_cert_not_issuable: '证书无法签发令牌', err_cert_expired: '证书已过期', err_invalid_token: '无效令牌',
    err_invalid_issue_times: '无效的签发时间 (Begin, Duration, TTL)', err_issue_begin_range: '签发开始时间必须在 0 至 253405000799999 之间', err_issue_dur_range: '签发期间必须大于 0 秒', err_dat_ttl_range: 'DAT TTL 必须大于 0', err_gen_count_range: '生成数量必须在 1 至 100 之间',
    err_invalid_port: '无效的端口号', err_invalid_db_port: '无效的数据库端口号', err_invalid_db_cache: '无效的数据库缓存时间 (0–3600)', err_invalid_cron: '无效的 Cron 表达式', err_invalid_delay: '无效的签发延迟', err_invalid_issue_dur: '无效的 DAT 签发期间', err_invalid_dat_ttl: '无效的 DAT TTL', err_invalid_kube_ns: '无效的 Kubernetes 命名空间', err_invalid_kube_replicas: '无效的 Kubernetes replicas (1–12)',

    cms_certs: '证书', cms_status: '状态', cms_debug_mode_only: '仅调试模式', cms_binary: '二进制', cms_opt_env: '选项 (环境变量)', cms_opt_hostname_desc: '仅用于日志文件名', cms_opt_port_desc: '服务端口', cms_opt_db_uri_desc: '数据库 URI', cms_supported: '支持', cms_opt_debug_desc: '调试模式', cms_opt_log_console_desc: '控制台输出', cms_no_out: '无输出', cms_value: '值',
    cms_log_text_desc: '使用文本日志文件', cms_log_json_desc: '使用 JSON 日志文件 (用于 ELK)', cms_no_log_file: '无日志文件', cms_disabled: '已禁用', cms_schedule: '计划', cms_set_default_value: '设置默认值', cms_k8s_multi_pods_example: 'Kubernetes 多 Pod 示例', cms_ex: '示例：',

    cms_help_cert_issue_delay: `
        生成证书后，将签发延迟到设置的 Delay 结束。<br/>
        这为集群中的多台服务器同步新证书留出足够时间。<br/>
        例如，假设 CMS 创建证书 A，服务器 1 和 2 每 60 秒获取一次。<br/>
        如果服务器 1 先获取并用证书 A 签发 DAT，而服务器 2 尚未同步，则服务器 2 无法验证和解析该 DAT。<br/>
        将此值设为 180 秒，可让证书在创建后 180 秒内不可签发。<br/>
        签发仅在 180 秒后开始，使其他所有服务器都能安全完成同步。<br/>
        考虑临时网络故障等情况，请将其设为各服务器同步间隔的至少 3至4 倍。`,
    cms_help_dat_issue_dur: `
        从 <b>{cert_issue_delay}</b> 结束后开始，证书可签发 DAT 的期间。<br/>
        期间结束后，证书不能再签发新 DAT，只能验证和解析已签发的 DAT。`,
    cms_help_dat_ttl: `
        已签发 DAT 的寿命。<br/>
        即使证书的 <b>{cert_issue_delay}</b> 已结束，在 <b>{dat_ttl}</b> 期间仍可用该证书解析和验证，以保证已签发 DAT 的完整寿命。<br/>
        证书最终在 <b>{cert_issue_delay}</b> 和 <b>{dat_ttl}</b> 均结束后过期。`,
    cms_help_cert_cron: `
        用于定期生成新证书的 Cron 表达式。<br/>
        请考虑设置的 <b>{cert_issue_delay}</b> 和 <b>{dat_issue_dur}</b>，避免间隔过长。<br/>
        反之，间隔过短会过于频繁地生成不必要的证书，并浪费连接服务器同步和处理它们的资源，因此请选择合适的运维间隔。`,
    bench_title: '性能', bench_note: '在 2024 Mac mini M4 基础型 (10 核) 上实测 · 图表仅显示 IV-AES256-GCM', bench_table: '原始数据 (每 10,000 次操作的 ms)', bench_issue: '签发 10,000 个 DAT', bench_parse: '解析 10,000 个 DAT', bench_multi: '多线程', bench_single: '单线程',
}
