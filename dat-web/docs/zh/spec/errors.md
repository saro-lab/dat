# 错误代码

DAT 实现会将稳定的错误代码与人类可读消息分开提供。程序应根据代码和重试分类做决策，而不是比较消息字符串。

## 代码格式

```text
DAT_<AREA>_<CAUSE>
```

| 前缀 | 区域 |
| --- | --- |
| `DAT_TOKEN_` | DAT 字符串与过期 |
| `DAT_CERT_` | 证书字符串与状态 |
| `DAT_SIG_` | 签名与验证 |
| `DAT_CRYPTO_` | 加密与解密 |
| `DAT_KEY_` | 密钥格式与权限 |
| `DAT_MANAGER_` | 证书管理器 |
| `DAT_CONFIG_` | 调用参数与配置 |
| `DAT_INTERNAL_` | 运行时内部 |
| `DAT_CMS_` | CMS 客户端同步 |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | CMS 服务器 |

`_UNKNOWN` 仅在错误无法归入该区域其他代码时使用。同一原因在各区域使用同一名称。

## 重试分类

| 分类 | 含义 | 处理 |
| --- | --- | --- |
| 短暂 | 外部条件恢复后可能成功 | 通过退避有限次重试 |
| 状态 | 证书同步或时间变化后可能成功 | 刷新所需状态后重试 |
| 永久 | 相同输入会再次失败 | 修复输入、配置或代码 |

## 令牌与证书

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
DAT 的字段数量、数值或 Base64Url 表示无效。丢弃该输入。
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
DAT 的过期时间等于或早于当前时间。获取新 DAT。
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
证书字符串的结构或字段表示无效。
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
没有与 DAT 的 `cid` 匹配的证书。检查证书同步状态。
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
所需证书可能尚未到达服务。立即同步后重新评估。
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
尚未到达证书开始时间。检查系统时钟和证书分发时机。
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
证书的验证期已结束。
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
同一 `cid` 在单个导入列表中出现多次。拒绝整个导入。
</ErrorCode>

## 签名、加密与密钥

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
签名与正文不匹配。DAT 已被篡改，或由不同密钥签名。
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
AES-GCM 认证标签不匹配。检查密文篡改或证书不匹配。
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
密钥长度、格式或算法组合无效。
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
尝试使用仅验证证书签发 DAT。签发服务需要完整证书。
</ErrorCode>

`DAT_SIG_MISMATCH` 和 `DAT_CRYPTO_TAG_MISMATCH` 是公开安全事件 API 分类为 true 的错误。单个无效输入不是服务中断，但重复出现时应视为安全观测事件。

## 管理器与配置

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
管理器中没有证书。导入证书或完成 CMS 同步。
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
管理器有证书，但当前没有可签发的完整证书。检查 cause chain 中的过期、开始时间或仅验证状态。
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
调用参数或配置值超出允许范围。
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
当前平台不支持所需的密码学或网络功能。
</ErrorCode>

## CMS 客户端

| 代码 | 含义 | 典型处理 |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | CMS URI 无效 | 修正配置 |
| `DAT_CMS_UNAUTHORIZED` | 认证失败 | 修正令牌 |
| `DAT_CMS_FORBIDDEN` | 令牌角色缺少权限 | 检查令牌角色 |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | 路径缺失或不同 | 检查 CMS URL 和路径 |
| `DAT_CMS_NETWORK` | 连接或传输失败 | 检查网络后退避 |
| `DAT_CMS_TIMEOUT` | 超过时间限制 | 调整网络和超时设置 |
| `DAT_CMS_SERVER_ERROR` | CMS 服务器错误 | 检查服务器状态后退避 |
| `DAT_CMS_RESPONSE_INVALID` | 成功响应格式无效 | 检查服务器-客户端契约 |
| `DAT_CMS_VERSION_RESET` | 服务器版本后退 | 检查 CMS 数据和部署状态 |
| `DAT_CMS_IMPORT_FAILED` | 无法应用收到的证书 | 检查 cause chain |
| `DAT_CMS_STOPPED` | 使用了已停止的管理器 | 创建新管理器或修正调用顺序 |

首次同步为尽力而为的库会将错误存入 last-error 字段。如果启动必须失败，请使用直接返回或 throw 错误的立即同步 API。

## CMS 服务器

| 代码 | HTTP | 含义 |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | 令牌缺失或无效 |
| `DAT_AUTH_FORBIDDEN` | 403 | 令牌角色不允许请求 |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | 不支持的算法名称 |
| `DAT_REQ_NOT_FOUND` | 404·405 | 路径或方法不匹配 |
| `DAT_REQ_TOO_LARGE` | 413 | 为过大请求正文保留的代码 |
| `DAT_STORE_UNAVAILABLE` | 503 | 存储临时不可用 |
| `DAT_STORE_UNKNOWN` | 500 | 未分类的存储处理错误 |

当前客户端不直接暴露 non-2xx JSON 响应中的服务器代码；它们将 HTTP 状态转换为 `DAT_CMS_*` 代码。因此，服务器日志和客户端错误代码可能不同。

## 按语言访问

| 环境 | 错误代码 | 重试分类 |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

对于带底层 cause 的错误，请检查该语言的异常链或 cause 访问 API。

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
