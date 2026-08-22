# AI 编程指南

## 氛围编程（Vibe Coding）示例

```
请把 DAT 应用到当前这个 Web 服务器的会话认证上。
它是一种类似 JWT 的分布式访问令牌，文档在 https://dat.saro.me/llms.txt
请先读完文档再开始。把整套 llms 文档全部下载下来放进 docs/dat 文件夹，并同步更新智能体文档。

- 项目：Java Spring Boot，正在使用 Spring Security
- 目标：把会话替换为 DAT
- DAT-CMS 服务器：http://localhost:8088 请改为写在配置属性里
- 签名算法：HMAC-SHA512-MFS
- 加密算法：IV-AES256-GCM
- 其余一律使用默认值

不要凭猜测编造文档中没有的 API。
```


## 算法

### 签名

| 算法 | 特征 |
| --- |---|
| `HMAC-SHA256-MFS`<br/>`HMAC-SHA384-MFS`<br/>`HMAC-SHA512-MFS` | · 基于哈希<br/>· 对称密钥<br/>· 速度快<br/>· [HMAC](https://en.wikipedia.org/wiki/HMAC) |
| `ECDSA-P256`<br/>`ECDSA-P384`<br/>`ECDSA-P521` | · 基于椭圆曲线<br/>· 非对称密钥<br/>· 以速度换取安全性<br/>· [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) |

- HMAC 的**速度具有压倒性优势**，因此如果只在意抵御外部入侵，推荐选择 HMAC。
  - [查看各算法与各语言的基准测试](./intro#performance)
- 使用 ECDSA 时，得益于公钥结构，可以把签发服务器与验证服务器分开部署；在权限与角色划分清晰的大规模服务器系统中采用它，可以理解为强化了针对内部人员入侵的安全性。

### 加密

| 名称 | 密钥长度 |
| --- |---|
| `IV-AES128-GCM` | 128 位 |
| `IV-AES256-GCM` | 256 位 |

- DAT 所加密的数据很短，因此 128 位与 256 位在实测中几乎没有差别。
- AES 实际上几乎不消耗资源，所以推荐安全余量更大的 256 位。


## DAT-CMS 服务器

**[安装 DAT-CMS](./svc/docker-saro-lab-dat-cms)**

DAT-CMS 并非必需，但如果需要向多台服务器分发证书并将密钥轮换自动化，则强烈建议安装。

## 后续文档

- [DAT 是什么？](./intro) - DAT 的设计背景
- [DAT 规范](./spec/dat) - 令牌的传输格式
- [所有库](./libs/) - 各语言的安装方法与示例
