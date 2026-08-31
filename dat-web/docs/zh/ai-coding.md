# AI 氛围编程

将当前项目和想实现的行为告诉 AI，可让 DAT 更易于集成。在以下示例中，只需按项目修改 URL 和环境变量名。

## 简单实现

想快速创建基本结构时，使用此提示词。

```text
我正在使用 Kotlin 和 Spring Boot。
请向 Spring Security 添加 DAT 认证。

首先阅读 https://dat.saro.me/llms.txt，并查看
DAT 规范和官方库文档。

验证 Authorization 标头中的 Bearer 令牌，
认证成功时将用户信息放入 SecurityContext。

此服务器不签发 DAT，只进行验证。
它必须从 DAT CMS 接收仅验证证书。

先在项目中查找 CMS 服务器 URL 和令牌设置。
如果找不到，请询问我，不要虚构值。

使用官方 Java/Kotlin DAT 库，
并遵循现有项目结构和编码风格。
```

## 详细实现

想精确指定认证流程和错误处理时，使用此提示词。

```text
此项目使用 Kotlin、Spring Boot 和 Spring Security。
请先查看当前安全配置，再添加 DAT 认证。

首先阅读 https://dat.saro.me/llms.txt，并查看
DAT 规范、证书同步和官方库 API。

请实现以下要求。

- 从 Authorization: Bearer 标头读取 DAT。
- 如果没有 DAT，作为匿名请求继续。
- DAT 无效或过期时返回 401。
- 验证成功时，将用户 ID 和权限放入 SecurityContext。
- 只从 plain 中读取可安全公开的值。
- 从已验证的 secure 数据中读取用户 ID 和权限。
- 此服务器仅验证，因此使用 DAT CMS 的仅验证证书。
- 从环境变量读取 CMS URL 和令牌。
- 如果启动时证书同步失败，也应使应用启动失败。
- 运行时自动刷新证书，关闭时关闭管理器。
- 使用 DAT 错误代码区分失败原因，不要使用错误消息。
- 不要记录原始 DAT、CMS 令牌或个人数据。

先检查项目的 Spring Security 配置和用户/权限模型。
如果 CMS URL、令牌环境变量或 secure 数据格式不明确，请在实现前询问。
只使用官方 Java/Kotlin DAT 库的 public API。

编辑代码前，请简要说明认证流程和将修改的文件。
```

## 应该选择哪个示例？

- 如果想先获得可运行代码，请使用**简单实现**。
- 如果需要生产环境的认证流程，请使用**详细实现**。

如果 AI 提问，请先提供 CMS URL、保存令牌的环境变量，以及 `secure` 中存储的用户信息。
