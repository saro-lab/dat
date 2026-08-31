# DAT CMS

DAT CMS 是一个可选服务，用于创建、存储证书并将其分发给客户端管理器。本文说明客户端与服务器之间的同步契约。安装与运维请参阅 [DAT CMS 服务指南](../svc/docker-saro-lab-dat-cms)。

<FlowDiagram
  title="证书同步"
  :actors="[
    {id: 'client', label: '客户端', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: '请求当前版本和证书', kind: 'req'},
    {from: 'cms', to: 'client', label: '返回版本和证书', kind: 'res'},
    {from: 'client', label: '全部验证后原子应用', kind: 'note'},
  ]"
/>

## 按角色划分的端点

| 角色 | 路径 | 使用者 |
| --- | --- | --- |
| 获取完整证书 | `GET /v1/certs?version=<n>` | 签发 DAT 的服务 |
| 获取仅验证证书 | `GET /v1/certs/verify-only?version=<n>` | 仅验证和解密的服务 |
| 注册证书 | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | 运维人员或证书生成作业 |

完整和仅验证证书的获取可由不同令牌角色保护。设置客户端管理器的 `verifyOnly` 选项，避免仅验证服务请求完整证书。

## 版本游标

客户端将最后应用的版本发给服务器。如果服务器状态未变，无需再次发送证书。有新状态时，响应第一行包含版本，后续行包含证书。

成功响应若只有版本而没有证书，客户端保留现有证书和签发者。服务器版本低于客户端版本的响应会被视为错误，而不是回滚状态。

## 证书导入规则

- 同一 `cid` 在一个响应中出现多次时，拒绝整个响应。
- 新响应包含已持有的 `cid` 时，保留现有证书。
- 在一次操作中应用状态前，先解析并验证所有证书。
- 不要留下仅包含成功导入证书的部分集合。
- 从当前可签发的证书中选择合适的签发者。

## 初始同步与手动同步

构建客户端管理器时的首次同步通常是尽力而为。失败时管理器仍会创建，并保留具体的最后错误。如果应用必须启动失败，请调用库的立即同步 API，使错误返回调用者。

不使用自动同步的环境可禁用间隔，并在需要时直接同步。启用自动同步时，请在应用关闭期间关闭或停止管理器。

## 网络与错误

为生产环境设置连接和整体请求超时。各运行时的重定向策略不同，请参阅库文档。当前客户端根据 HTTP 状态将 non-2xx CMS 响应分类为 `DAT_CMS_*` 错误，不保留服务器 JSON 响应中的详细错误代码。

在临时存储故障期间，服务器可继续提供最后一份成功的证书快照。若还没有成功快照，则返回 `DAT_STORE_UNAVAILABLE`。

## 服务文档

有关部署、数据库、访问令牌和运行时配置，请继续阅读 [DAT CMS 服务指南](../svc/docker-saro-lab-dat-cms)。

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
