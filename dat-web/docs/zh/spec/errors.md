# 错误码

DAT 官方支持的各服务库共用的错误码。

每个码都带有 **影响**、**重试** 两个值，部分还会额外带上 **可疑** 标签。

## 影响 — 服务受到多大冲击

这是设置告警的依据，只看一件事：“现在服务停了吗”。

| 影响 | 含义 | 例子 |
| --- | --- | --- |
| <span class="lg lg-critical">致命</span> | 服务或某项功能**停止**。无法签发、同步永久失败、初始化失败 | 签发服务器手上一张可用证书都没有 |
| <span class="lg lg-partial">部分</span> | 部分请求或周期失败，但服务继续运行，通常会自行恢复 | CMS 的一个周期失败，现有证书继续工作 |
| <span class="lg lg-none">无影响</span> | 拒绝掉一个请求就结束了 | 收到被篡改的令牌，过滤掉即可 |

**无影响** 不是告警的对象。如果一条错误输入就要让所有值班人员去看，告警本身就失去意义了。

## 可疑 — 持续出现就要排查

带 <span class="lg lg-suspect">可疑</span> 标签的码，**只出现一次时属于正常运行的一部分**。客户端随时可能发来错误的值，把它过滤掉正是库的本职。

但如果这类错误**持续发生，或者从某个来源集中涌来**，那就是两种情况之一。

- **配置异常** — 部署有误、还残留着旧版客户端、或者证书对不上。
- **攻击尝试** — 有人在篡改令牌或密钥、试图通过验证，或者在探测哪些值有效。

所以这些码正确的做法是**把计数做成指标**，只在超过阈值时才通知。

## 重试

| 重试 | 含义 |
| --- | --- |
| <span class="lg lg-transient">暂时</span> | 退避后重试即可解决 |
| <span class="lg">永久</span> | 禁止重试，必须修正配置或输入 |
| <span class="lg">状态</span> | 是信号，不是错误 |

---

## 令牌

收到的令牌字符串本身的问题。

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="拒绝请求">
以点分隔的部分不是 5 个，或 <code>expire</code> 不是纯十进制，或 <code>cid</code> 不是纯十六进制，或 <code>plain</code>、<code>secure</code> 不是 base64url，或数值字段超出了整数表示范围。
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="引导重新签发令牌">
<code>expire &lt;= now</code>。<strong>整点也算过期</strong> — <code>expire == now</code> 就视为已经过期。
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="查看日志">
无法归入以上任何一类的令牌错误。
</ErrorCode>

::: tip 过期和格式错误必须区分开
两者的处理正好相反 — 过期是正常的生命周期结束，让对方刷新令牌即可；格式错误则说明它根本不是一个有效签发的令牌，必须拒绝。

解析时**先确定结构，再看取值**。像 `"1.2.3"` 这种部分不足的字符串不是过期的令牌，而根本就不是令牌，因此是 `DAT_TOKEN_MALFORMED`。

`expire` 字段带符号（如 `+100`）同样属于格式错误而非过期。只接受纯 ASCII 数字。
:::

---

## 证书

证书字符串的格式，以及该证书现在是否可用的问题。

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="重新分发证书">
以点分隔的部分不是 8 个，或 <code>cid</code>、<code>start</code>、<code>duration</code>、<code>ttl</code> 解析失败，或密钥字段不是 base64url，或 <code>start + duration + ttl</code> 超出了 u64。
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="更新证书">
<code>start + duration + ttl &lt; now</code>。完全过期，既不能签发也不能验证。
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="等待">
<code>now &lt; start</code>。签发窗口尚未开启。
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="分发新证书">
<code>now &gt; start + duration</code>，但 ttl 还有剩余。已无法签发，只能验证。
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="检查分发配置">
只含公钥、不含签名私钥的证书。可以验证但无法签发。
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="拒绝请求">
没有持有与令牌 <code>cid</code> 对应的证书。要么令牌是伪造的，要么分发出了问题。
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="同步后重试">
该 <code>cid</code> 还没从 CMS 收到。刚分发新证书之后会短暂出现。
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="检查服务器响应">
正在 import 的列表中同一个 <code>cid</code> 出现了两次以上。
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="查看日志">
无法归入以上任何一类的证书错误。
</ErrorCode>

`DAT_CERT_NOT_FOUND` 和 `DAT_CERT_NOT_SYNCED` 表面症状相同，但处理方式不同。前者是从未签发过的 `cid`，等下去也不会出现；后者只要同步跟上就会消失。

`DAT_CERT_NOT_FOUND` 出现一次过滤掉即可，但如果突然增多，就说明分发对不上了，或者有伪造令牌在流通。

---

## 签名

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="阻断会话，记入安全日志">
签名验证以<strong>不匹配</strong>结束。HMAC 值不同，或 ECDSA verify 返回 false。
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="拒绝请求">
签名部分为空，或不是 base64url，或 ECDSA 的 <code>r‖s</code> 长度与曲线不符，或 DER 转换失败。
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="检查签发服务器配置">
用 verify-only 的密钥尝试签名。运行时不存在私钥。
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="检查密钥类型与库">
签名、验证的<strong>运算本身没能执行。</strong>密钥类型错误、句柄已释放，或密码库内部错误。
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="查看日志">
无法归入以上任何一类的签名错误。
</ErrorCode>

::: warning 不要把不匹配和后端故障混为一谈
这两个码所在的轴正好相反。

- `DAT_SIG_MISMATCH` — 只是收到的签名对不上，**对服务没有影响**，但持续出现就属于 **可疑**。
- `DAT_SIG_BACKEND` — 验证运算本身跑不起来，是**实现侧的问题**，不属于可疑。

把密钥类型错误或库的 bug 报成“签名不匹配”，等于把实现侧出故障的情况混进了攻击指标。反过来，真正的伪造被归类成后端错误，就会整个从可疑指标里漏掉。
:::

---

## 加密

secure 载荷的加解密问题。

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="阻断会话，记入安全日志">
AES-GCM 认证标签不匹配。secure 被篡改，或者证书密钥不同。
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="拒绝请求">
密文非空但不超过 IV（12 字节），或输入超出了实现上限（如 <code>INT_MAX</code>）。
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="确认平台支持情况">
加解密运算没能执行。平台不支持 GCM，或上下文初始化失败。
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="查看日志">
无法归入以上任何一类的加解密错误。
</ErrorCode>

**空的 secure 载荷不是错误。** 空输入得到空输出，不会产生任何错误码。

在跳过签名验证的路径上，GCM 标签是**唯一的完整性检查**。因此不把 `DAT_CRYPTO_TAG_MISMATCH` 和其他解密失败归为同一个码。

---

## 密钥

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="更换密钥">
密钥长度与声明的算法不符（HMAC 32/48/64，AES 16/32），或点不在曲线上，或 <code>d ∉ [1,n-1]</code>，或不是非压缩（0x04）格式，或私钥与公钥不成对。
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="更换算法">
对 HMAC 系算法请求了 verify-only 导出。
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="查看日志">
无法归入以上任何一类的密钥错误。
</ErrorCode>

**看起来相似但完全不同的三个：**

| 错误码 | 含义 |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **算法的结构性限制。** HMAC 是对称密钥，本就没有公钥的概念 |
| `DAT_SIG_KEY_MISSING` | **运行时状态。** 当前这把密钥里没有私钥 |
| `DAT_CERT_VERIFY_ONLY` | **分发形态。** 这张证书是按仅供验证分发的 |

---

## 管理器

持有证书并用于签发、验证的对象的状态。

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="检查 CMS 连接">
一张证书都没有持有。要么还没 import，要么 CMS 首次同步失败。
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="看原因（cause）判断 — 见下表">
有证书，但现在没有一张能用于签发。<strong>原因会一并传出。</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="修正调用代码">
使用了已经释放的管理器或证书。
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="查看日志">
无法归入以上任何一类的管理器错误。
</ErrorCode>

`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` 的原因（`cause`）是以下四者之一。**每种原因该做的事完全不同。**

| 原因 | 含义 | 重试 | 处理 |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | 签发窗口尚未开始 | **临时** | 等一等就好 |
| `DAT_CERT_ISSUANCE_ENDED` | 签发窗口结束，只能验证 | 永久 | 需要分发新证书 |
| `DAT_CERT_EXPIRED` | 持有的证书全部过期 | 永久 | 需要更新证书 |
| `DAT_CERT_VERIFY_ONLY` | 持有的证书全是仅供验证 | 永久 | **分发配置出错了** |

如果签发服务器被配置成只接收仅供验证的证书，出来的就是 `DAT_CERT_VERIFY_ONLY`。等多久都不会好，所以不属于重试的范畴。

---

## 配置

调用方传入的值有问题。`CONFIG` 系全部是**必须改代码的错误**，运行中出现就说明部署有误。

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="核对算法名称">
未知的算法名称。必须与线上表示（<code>ECDSA-P256</code>、<code>IV-AES256-GCM</code>）完全一致。
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="修正调用代码">
必填参数为 null，或超出允许范围（负的时间值、<code>interval &lt;= 0</code>），或类型不受支持（在动态类型语言中把数字或布尔值当作 payload 传入），或待签名的 body 为空。
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="修正 URI">
CMS 服务器 URI 不符合规范。无法解析、scheme 不是 http/https、或带有路径或查询串。
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="查看日志">
无法归入以上任何一类的配置错误。
</ErrorCode>

---

## 内部

运行环境与运行时的问题。

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="检查部署与平台">
根本没有密码后端或运行时 API。缺少 <code>crypto.subtle</code>、平台不支持 AES-GCM、运行时版本过低。
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="查看日志">
内存分配失败、随机数生成失败、获取锁失败，或者走到了设计上不可达的分支。
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` 修好部署环境就能解决，而 `DAT_INTERNAL_UNKNOWN` 多半是运行时故障或库的 bug。

---

## CMS 同步

不使用 CMS 同步就不会出现这些码。

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="退避后重试">
DNS 失败、连接被拒、TLS 失败、<strong>超时</strong>。超时不单列错误码而是并入这里 — 因为处理方式相同。
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="核对令牌配置">
服务器返回 401。令牌缺失或有误。
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="核对令牌等级">
服务器返回 403。令牌有效，但没有该端点的权限。
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="核对 URL 配置">
服务器返回 404。URL 有误。
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="退避后重试">
服务器返回 5xx。
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="查看状态码">
上述之外的非 2xx 响应。
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="核对服务器版本">
响应里没有 version 行，或 version 行不是纯十进制，或超出了范围。
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="查看 cause 中的 CERT_* / KEY_*">
响应收到了，但证书没能应用。<strong>原因放在 <code>cause</code> 里。</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="已自动处理">
服务器返回了比客户端更旧的 version。这是全量重新同步的指示。
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="等待首次同步">
一次都还没有同步成功。
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
上一次同步还在跑，因此跳过了本周期。这不是错误。
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="检查构建选项">
构建时没有包含 CMS 功能。feature 未启用，或未内置 CURL。
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="查看日志">
无法归入以上任何一类的 CMS 错误。
</ErrorCode>

被判定为同步**永久失败**的码（`UNAUTHORIZED`、`FORBIDDEN`、`ENDPOINT_NOT_FOUND`、`MALFORMED`、`IMPORT_FAILED`）全部是致命。重试也解决不了，而证书还在不断过期，放着不管服务必然会停。

反过来，`UNREACHABLE`、`SERVER_ERROR` 属于部分。现有证书继续工作，下个周期通常会自行恢复 — **但一直失败下去最终会升级成致命。** 请以连续失败次数为基准设置告警。

::: tip 同步失败不会以异常抛出
即使首次同步失败，管理器也会正常返回 — 晚一点同步上也比一开始就起不来要好。失败会改为保留为**可查询的状态**。

| 客户端 | 查询方式 |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

一次都没成功过时是 `DAT_CMS_NOT_SYNCED`，一切正常时为空。
:::

---

## 服务器

CMS 服务器产生的码。客户端**不会产生这些码，只会收到**。

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
没有 <code>Authorization</code> 头，或令牌未注册在任何等级中。
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
令牌已注册，但不是该端点所要求的等级。
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="立即设置令牌">
一个令牌都没配置，认证被整体关闭。<strong>连证书签发 API 也在无认证状态下开放。</strong>它不会作为响应返回，只会打印到启动日志。
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
无法解析路径或查询参数，或参数超出允许范围（负的 delay、超过十年等）。
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
不认识请求路径中的算法名称。
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
没有这条路由，或者方法不匹配。
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
请求体大小超出上限。
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
无法归入以上任何一类的请求错误。
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="退避后重试">
数据库连接断开、连接池耗尽、锁竞争、超时。<strong>这是唯一使用 503 的码</strong>，也是客户端得以判断“这个等一等就好”的信号。
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="检查数据库状态">
读写失败、表不存在、schema 不匹配，或已存储的证书行损坏。
</ErrorCode>

响应信封：

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

在生成和处理证书过程中出现的错误，服务器同样直接使用上面的公共码（`DAT_CERT_*`、`DAT_KEY_*`、`DAT_CONFIG_*`）。

### 收到服务器的码之后

客户端会用自己的 `CMS` 码把服务器的码包起来，原始码保存在 `cause` 中。

| 收到的码 | HTTP | 客户端产生的码 |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*`（其他） | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| （version 回退） | 200 | `DAT_CMS_VERSION_RESET` |

---

## 按症状查找

| 症状 | 错误码 |
| --- | --- |
| 刚登录时正常，过一会儿就被拒绝 | `DAT_TOKEN_EXPIRED` — 令牌到期了，重新签发即可 |
| 只有某台服务器验证失败 | `DAT_CERT_NOT_SYNCED` — 那台服务器还没收到新的 CID |
| 所有服务器都拒绝同一个令牌 | `DAT_CERT_NOT_FOUND` — 这是从未签发过的 CID |
| 签发服务器造不出令牌 | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **按 verify-only 分发了** |
| 只在刚启动时签发失败 | `DAT_MANAGER_NO_CERTIFICATE` — 还没完成首次同步，稍后会好 |
| CMS 同步持续失败 | `DAT_CMS_UNAUTHORIZED` — 令牌错了，重试也解决不了 |
| 一张证书都没收到 | `DAT_CMS_ENDPOINT_NOT_FOUND` — URL 写错了 |
| 只在某个平台上失败 | `DAT_INTERNAL_UNAVAILABLE` — 缺少密码后端 |
| 验证失败突然增多 | `DAT_SIG_MISMATCH` — 一次无害，但**成批出现就是伪造尝试** |
| secure 解密突然失败 | `DAT_CRYPTO_TAG_MISMATCH` — 证书对不上，或者是**篡改** |
| CMS 启动日志出现警告 | `DAT_AUTH_DISABLED` — **认证关着。** 签发 API 是敞开的 |

---

## 附录

### 错误码语法

```
DAT_<领域>_<原因>
```

- 同一原因出现在不同领域时，**原因名是相同的**。`DAT_TOKEN_MALFORMED` 和 `DAT_CERT_MALFORMED` 只是对象不同，含义一致。
- `_UNKNOWN` 是各领域的**兜底专用**，不会用作“未知算法”之类的其他含义（那是 `_UNSUPPORTED`）。
- 错误码字符串是公开契约。消息可以随意改，但码不改。

| 分类 | 码前缀 |
| --- | --- |
| 令牌 | `DAT_TOKEN_` |
| 证书 | `DAT_CERT_` |
| 签名 | `DAT_SIG_` |
| 加密 | `DAT_CRYPTO_` |
| 密钥 | `DAT_KEY_` |
| 管理器 | `DAT_MANAGER_` |
| 配置 | `DAT_CONFIG_` |
| 内部 | `DAT_INTERNAL_` |
| CMS 同步 | `DAT_CMS_` |
| 服务器 | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### 各客户端的取用方式

| 客户端 | 错误类型 | 错误码 | 重试分类 | 安全事件 |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| CMS 服务器 | JSON 信封 | `code` 字段 | — | — |

`安全事件` 只在伪造、篡改已经确定的两种情况（`DAT_SIG_MISMATCH`、`DAT_CRYPTO_TAG_MISMATCH`）下返回 `true`。本文档的 **可疑** 标签范围更宽（还包括被篡改的令牌、密钥和请求），目前只是文档层面的分类，并未通过客户端 API 暴露。

**影响** 等级同样是文档层面的分类，因为同一个码在不同地方发生时打击并不相同 — 例如 `DAT_KEY_INVALID` 在过滤收到的令牌时没有影响，但如果是在 CMS 同步过程中读证书时出现，整个同步就会失败。

**下层原因不会被丢弃。** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` 和 `DAT_CMS_IMPORT_FAILED` 通过各语言的异常链（`cause` / `__cause__` / `InnerException` / `Unwrap()`）传递原因。

::: warning C/C++ 同时保留整数值
`dat_error_t` 原有的整数值为了 ABI 兼容而保留，但**字符串码才是正本**。库不再返回旧的值，因此 `err == DAT_ERROR_INVALID_DAT` 这样的比较不会匹配，请改用 `dat_error_code(e)` 对照。

C 没有异常链，因此原因需通过 `dat_manager_issuable_cause()` 单独获取。
:::

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>

<style scoped>
/* 범례 배지 — ErrorCode 컴포넌트의 배지와 같은 모양이라 눈으로 바로 이어진다. */
.lg {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
}
.lg          { background: color-mix(in srgb, currentColor 8%, transparent); opacity: 0.7; }
.lg-critical { background: color-mix(in srgb, #dc2626 16%, transparent); color: #dc2626; opacity: 1; }
.lg-partial  { background: color-mix(in srgb, #ea580c 16%, transparent); color: #ea580c; opacity: 1; }
.lg-none     { background: color-mix(in srgb, currentColor 8%, transparent); color: var(--c-muted); opacity: 1; }
.lg-suspect  { background: none; border: 1px solid color-mix(in srgb, var(--c-accent-2) 55%, transparent); color: var(--c-accent-2); opacity: 1; }
.lg-transient { background: color-mix(in srgb, var(--c-link-1) 16%, transparent); color: var(--c-link-1); opacity: 1; }
</style>
