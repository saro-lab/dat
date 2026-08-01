# CMS 同步与证书运维

## 1. 概述

**DAT CMS（Certificate Management Service）**是负责生成并分发整个集群共享的证书的服务器。

各应用通过 CMS 客户端（`DatCmsManager`）定期获取证书列表，而这种同步**将密钥轮换自动化**。即使运维人员不亲自更换密钥，证书也会按既定周期重新生成，旧证书则会自行过期。

<ArchFlow
    :user="{label: '用户', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['按有效期生成证书', '清理过期证书']}"
    :service="{servers: [
        {label: '登录服务器', kind: 'issuer', icon: 'login',
         request: '登录请求', response: '用证书签发 DAT', sync: '同步可签发 DAT 的证书'},
        {label: '内容服务器', kind: 'verifier', icon: 'apps',
         request: '携带 DAT 请求内容', response: '验证 DAT 后提供服务', sync: '同步仅供验证的证书'},
    ]}"
/>

只有登录服务器会拿到可用于签发的证书，内容服务器只拿到仅供验证的证书。**内容服务器只需知道 CMS，无需知道登录服务器。**

---

## 2. 同步协议

### 2.1. 请求与响应

<FlowDiagram
    title="一个同步周期"
    :legend="{req: '请求', res: '响应', sync: '证书同步'}"
    :actors="[
        {id: 'app', label: '应用', kind: 'issuer'},
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
    ]"
    :steps="[
        {from: 'app', label: '持有 version = N', kind: 'note'},
        {from: 'app', to: 'cms', label: 'GET /v1/certs?version=N (Authorization: 令牌)', kind: 'req'},
        {from: 'cms', label: '服务器 version = M，筛选出比 N 更新的证书', kind: 'note'},
        {from: 'cms', to: 'app', label: '第 1 行：M / 第 2 行起：证书列表', kind: 'res'},
        {from: 'app', label: '若列表为空则保持 version 并结束', kind: 'note'},
        {from: 'app', label: '仅当 import(clear = true) 成功时才置 version = M', kind: 'note'},
    ]"
/>

| 端点 | 用途 |
| --- | --- |
| `GET /v1/certs?version=N` | 完整证书（含签名私钥） |
| `GET /v1/certs/verify-only?version=N` | 仅验证用证书 |
| `GET /v1/certs.json`、`/v1/certs/verify-only.json` | 相同内容的 JSON 格式 |
| `POST /v1/cert/{sig-alg}/{crypto-alg}/{delay}/{duration}/{ttl}` | 手动生成证书（需要 Master 令牌） |
| `GET /health` | 健康检查 |

响应正文是纯文本，**第一行是服务器当前的 version**，从第二行开始每行放一张证书。

```
1712345678
1a.1712345000.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
2b.1712348600.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
```

### 2.2. 版本游标

客户端会记住最后一次成功的 version，并在下一次请求时带上它。服务器只挑选比该值更新的证书返回。

* 客户端的 version **比服务器旧**时 → 只返回此后新生成的证书。
* 客户端的 version **比服务器新**时（服务器更换、数据库初始化等）→ 将游标回退为 `0`，返回**全量集合**。
* 客户端**只有在导入成功的情况下**才推进 version。这是为了避免游标因失败的响应而前移，导致永久性地漏掉某些证书。

::: tip 虽然是增量请求，但响应是全量替换
`?version=N` 是“请给我 N 之后的变更”的请求，但客户端会把收到的列表**替换掉原有列表，而不是与之合并（clear = true）**。这是因为服务器始终会判断出全部有效的证书并下发；正因如此，在 CMS 中被吊销（revoke）的证书不会残留在客户端。
:::

### 2.3. 认证令牌

CMS 通过三种令牌来划分访问权限。

| 令牌 | 权限 |
| --- | --- |
| `{{t('master_token')}}` | {{t('master_token_desc')}} |
| `{{t('full_cert_token')}}` | {{t('full_cert_token_desc')}} |
| `{{t('verify_cert_token')}}` | {{t('verify_cert_token_desc')}} |

原则上，对只做验证的服务器只发放 Verify Cert 令牌。不过加密密钥同样包含在 verify-only 响应中，因此关于其含义，请一并确认 [{{t('menu_spec_cert')}}](./dat-certificate#_5-verify-only-导出) 文档中的注意事项。

---

## 3. 证书签发延迟 (delay)

如果新证书一生成就立即用于签发，那么尚未完成同步的其他节点将无法验证由该证书签名的令牌。**签发延迟**正是为了消除这一区间而设置的值。

<CertTimeline
    title="延迟区间的作用"
    caption="在延迟区间内所有节点都会取走证书，之后才开始签发。"
    :marks="['创建', '开始签发', '结束签发', '最终过期']"
    :phases="[
        {label: '签发延迟', weight: 1.2, kind: 'delay', note: '等待全部节点同步'},
        {label: '可签发', weight: 3, kind: 'issue', note: '签发 + 验证'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: '仅验证'},
    ]"
/>

举例来说，假设 CMS 生成了证书 A，而服务器 1 和服务器 2 以 60 秒的周期进行同步。如果服务器 1 先取到并用 A 签发了 DAT，而服务器 2 尚未取到，那么服务器 2 就无法验证该 DAT。

如果把延迟设为 180 秒，那么证书生成后的 180 秒内将保持不可签发状态，在这段时间里所有服务器都能安全地完成同步。考虑到临时性的网络故障，建议将其设置为**至少是各服务器同步周期的 3～4 倍以上**。

---

## 4. 有意为之的行为

以下这些行为全都是**设计上有意为之的**，并不是缺陷。由于在运维时可能看起来与预期不符，故在此明确说明。

### 4.1. 签发窗口关闭之后仍会继续用缓存的证书签名

应用会持续使用在同步时刻选定的签发用证书，而不会在每次签发时重新检查 `issuable()`。

**理由：** 如果在与 CMS 断开连接的状态下签发窗口关闭，那么在“每次重新检查”的方式下，那一瞬间**整个服务的登录都会停摆**。DAT 在这种情况下选择了“即使没能取到新证书，也先继续签发”。

**代价：** 网络故障持续较久时，可能会继续用已经过了签发窗口的证书发出令牌。不过这些令牌在证书最终过期之前仍能在其他节点上正常通过验证，因此这被判断为一种优于“故障时服务直接挂掉”的权衡取舍。

### 4.2. 使用相同 CID 更新的证书会被丢弃

如果收到的证书与已持有证书的 CID 相同，则**忽略新收到的那一份**。

**理由：** CID 是证书的不可变标识符。如果同一个 CID 指向不同的密钥，那么已经签发并在流通中的令牌就无从判断应该用哪把密钥来验证。

::: warning 更换密钥必须使用新的 CID
如果保持同一个 CID 只更换密钥再分发，那么**它永远不会反映到客户端，而且也不会报错。** 更换密钥时，请签发使用新 CID 的证书。
:::

### 4.3. 没有新证书时会保留现有列表

如果响应中一张证书都没有，客户端会**原样保留已持有的列表**，而不会清空它。

**理由：** 在证书服务器宕机或响应异常这种最糟糕的时刻清空已持有的证书，会导致那一瞬间**所有令牌验证全部失败**。既然没有收到新的，那就用手上已有的撑住，这样更安全。

### 4.4. SINGLE_NODE 模式每次启动都会生成证书

以单节点模式运行 CMS 时，无论是否已存在可签发的证书，**每次启动都会生成一张证书**。

**理由：** 单节点模式是为了在没有额外基础设施的情况下独立运行 CMS 的配置。启动之后必须立刻就有可以签发的证书。

**注意：** 如果反复重启，证书会不断堆积。不过每张证书在超过自身的过期时刻后就会从列表中剔除，因此不会无限增长。

### 4.5. 没有可签发证书时会跳过延迟立即签发

在生成证书的时刻，如果一张可签发的证书都没有，CMS 会**跳过延迟区间**，并把延迟时间并入签发期限之中。

**理由：** 如果坚持保留延迟，那么在这段时间里整个集群一张令牌都签发不出来。在首次启动或全面故障恢复的场景下，必须能够立即签发。此时服务器日志中会留下一条警告。

---

## 5. 证书的回收与过期

* 证书会**一直保留在分发列表中，直到最终过期（`start + duration + ttl`）时刻为止**。并不会因为签发窗口关闭就立刻消失。
* 在签发窗口结束前夕发出的 DAT 还会再存活自己的 TTL，因此即使是在那之后才首次启动的验证服务器，也能取到证书并验证该令牌。
* 超过最终过期时刻的证书会从列表中剔除，并在之后的清理作业中从存储中移除。

---

## 6. 部署

CMS 服务器的运行选项，以及 Docker · Kubernetes · 二进制部署方式和环境变量，在单独的文档中说明。

- [{{t('menu_svc_cms')}} 部署指南](../svc/docker-saro-lab-dat-cms)

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import ArchFlow from "../../.vitepress/ui/ArchFlow.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
const {t} = useTranslate();
</script>
