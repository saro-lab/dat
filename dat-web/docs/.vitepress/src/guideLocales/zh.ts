import type { SharedGuideLocale } from './types'

export const zhGuideLocale: SharedGuideLocale = {
  libraryIndex: {
    title: '库',
    intro: '为应用所用语言选择 DAT 客户端。所有客户端均使用同一 DAT 和证书规范，并提供本地证书管理与 DAT CMS 同步。',
    criteriaTitle: '如何选择',
    criteriaBody: '签发 DAT 的服务必须能使用完整证书。仅验证和解密的服务应使用 ECDSA 仅验证证书和 CMS 仅验证角色。',
    flowTitle: '指南结构',
    flowBody: '每份库指南都介绍安装、最简签发与验证流程、DAT CMS 连接、同步策略、关闭和错误处理。',
  },
  library: {
    titleSuffix: '库', install: '安装', quickTitle: '快速开始', quickIntro: '此完整流程从 CMS 获取证书，创建包含 JSON 数据的 DAT，并进行验证。',
    stepTitle: '分步说明', connectTitle: '1. 连接 CMS', connectBody: '签发服务使用完整证书令牌。启动时立即同步，可防止在证书可用前签发。',
    issueTitle: '2. 签发 DAT', issueBody: '此示例将公开 JSON 放入 `plain`，将受保护的用户信息作为 JSON 放入 `secure`。',
    parseTitle: '3. 验证 DAT', parseBody: '`parse` 检查有效期和签名，然后解密 `secure`。只使用验证成功后返回的载荷。',
    functionsTitle: '关键函数', functionHeader: '函数', purposeHeader: '用途', dataTitle: '数据区域', plainBody: '已签名但未加密的字节。', secureBody: '加密字节。', payloadBody: '仅在 `parse` 成功后才可信任。',
    optionsTitle: 'JSON 之外的选项', optionsBody: '示例使用常见的 JSON。为加快处理，二进制数据可避免 JSON 序列化和解析，同时减少数据大小。',
    formatsBody: '将简单值存为文本，或将 Protobuf、MessagePack 等二进制格式的结构化数据放入 `plain` 和 `secure`。',
    verifyTitle: '仅验证服务', verifyBody: '不签发 DAT 的服务使用仅验证选项和仅验证令牌，且只调用 `parse`。',
    lifecycleTitle: '关闭与错误', errorsBefore: '使用', errorsLink: '错误代码和重试分类', errorsAfter: '，而不是错误消息。',
  },
  guides: {
    rust: { binaryNote: '由于 `issue` 当前接受字符串，请将任意字节编码为 Base64Url 或 Hex，验证后再解码。', lifecycle: '最后一个 `Arc<DatCmsManager>` 被 drop 时，自动同步任务结束。', apiPurposes: ['立即同步证书。', '用当前签发证书创建 DAT。', '验证 DAT 并返回载荷。', '返回最后一个同步错误。'] },
    java: { binaryNote: '`ByteArray` 重载不需额外格式即可直接存取字节。', lifecycle: '`DatCmsManager` 是 `AutoCloseable`；使用 `use` 或 `close()` 关闭。', apiPurposes: ['立即同步证书并报告失败。', '创建 DAT 并返回 DatResult。', '验证 DAT 并返回 Payload。', '返回最后一个后台同步错误。'] },
    javascript: { binaryNote: '传入 `Uint8Array` 或 `ArrayBuffer`，通过 `plainBytes` 和 `secureBytes` 取回原始字节。', lifecycle: '关闭时调用 `stop()` 清理定时器和进行中的请求。', apiPurposes: ['立即同步证书。', '异步创建 DAT 字符串。', '验证 DAT 并返回 DatPayload。', '返回最后一个同步错误。'] },
    python: { binaryNote: '直接传入 `bytes`，并通过 `plain_bytes` 和 `secure_bytes` 取回。', lifecycle: '启用自动同步时，关闭时调用 `stop()`。', apiPurposes: ['立即同步证书。', '创建 DAT 字符串。', '验证 DAT 并返回 DatPayload。', '返回最后一个同步错误。'] },
    csharp: { binaryNote: '使用 `byte[]` 重载以及 `PlainBytes` 和 `SecureBytes`。', lifecycle: '使用 `await using` 清理管理器和后台同步。', apiPurposes: ['立即同步证书。', '创建 DAT 字符串。', '验证 DAT 并返回 Payload。', '返回最后一个同步错误。'] },
    go: { binaryNote: 'Go 字符串可包含字节。将字节切片作为 `string` 传入，然后将结果转回 `[]byte`。', lifecycle: '启用自动同步时，使用 `defer cms.Close()` 保证清理。', apiPurposes: ['立即同步证书。', '返回 DAT 字符串和错误。', '返回已验证 Payload 和错误。', '返回最后一个同步错误。'] },
    ruby: { binaryNote: '传入二进制字符串，并通过 `plain_bytes` 和 `secure_bytes` 取回。', lifecycle: '启用自动同步时，调用 `stop` 结束后台线程。', apiPurposes: ['立即同步证书。', '创建 DAT 字符串。', '验证 DAT 并返回 DatPayload。', '返回最后一个同步错误。'] },
    c: {
      binaryNote: '当前 C 签发 API 接受以 NUL 结尾的字符串。将任意字节编码为 Base64Url 或 Hex，并使用载荷长度读取结果。',
      lifecycle: '使用各自的清理函数释放 `dat`、`payload` 和 `cms`。',
      apiPurposes: ['立即同步证书。', '分配并返回 DAT 字符串。', '分配并返回已验证载荷。', '返回最后一个同步错误。'],
      parse: `dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);
/* 使用 plain_bytes 和 secure_bytes 及其各自的长度。 */`,
      binary: `/* 由于 issue 接受 C 字符串，先编码包含 NUL 的数据。 */
const char *secure_hex = "00ff1080";
char *dat = NULL;
err = dat_cms_manager_issue(cms, "01", secure_hex, &dat);

dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);`,
    },
  },
  cms: {
    introBefore: 'DAT CMS 创建证书，将其存入数据库，并向签发和验证服务提供合适的证书。协议行为见', specLink: 'DAT CMS 规范', introAfter: '。',
    configTitle: '创建运行时配置', dockerTitle: '使用 Docker 运行',
    dockerBody: '以 non-root 用户运行容器。使用 SQLite 时，挂载可写数据目录。通过 Secret 注入机制传递令牌和数据库密码，而不是命令历史。',
    databaseTitle: '数据库', databaseBody1: '使用 `DB_URI` 配置 SQLite、PostgreSQL 或 MySQL 连接。MariaDB 通过 MySQL 协议连接。CMS 将证书查询结果缓存为快照，并在存储刷新临时失败时继续提供最后一份成功快照。',
    databaseBody2: '`DB_CACHE_SECS` 设置快照刷新间隔，`DB_QUERY_TIMEOUT_SECS` 限制刷新查询。如果没有成功快照且无法读取存储，服务返回 `DAT_STORE_UNAVAILABLE`。',
    rolesTitle: '访问角色', roleHeaders: ['环境变量', '权限', '使用者'],
    roleRows: [['注册证书并获取受保护版本', '运维'], ['获取完整证书', 'DAT 签发服务'], ['获取仅验证证书', '验证与解密服务']],
    rolesNote: '每个变量都接受逗号分隔的字母数字令牌。如果某角色的令牌列表为空，则其端点开放并记录警告。',
    certificateTitle: '证书生成', certificateBody: 'master 角色通过指定签名算法、加密算法、传播延迟、签发期间和 TTL 注册证书。在传播延迟期间，服务在新证书可签发前将其同步。',
    clientTitle: '客户端集成', clientSteps: ['签发服务使用 full 令牌和完整证书端点。', '验证服务使用 verify 令牌和仅验证选项。', '检查首次同步的结果；如果启动必须失败，调用立即同步 API。', '启用自动同步时，在应用关闭期间关闭管理器。'],
    libraryBefore: '有关各语言的 builder 和关闭行为，请参阅', libraryLink: '库指南', libraryAfter: '。',
    operationsTitle: '运维检查', operationsItems: ['`/health` 和 `/version/api` 无需认证即可报告状态。', '配置该角色时，`/version` 需要 master 令牌。', '从标准输出和标准错误收集日志。', '转发关闭信号，并留出时间让数据库和调度器关闭。'],
    kubernetesTitle: 'Kubernetes', kubernetesBody: '使容器端口和 probe 与服务端口一致，并为 non-root 用户以可写方式挂载数据目录。通过 Secrets 注入令牌和数据库连接详情。',
  },
}
