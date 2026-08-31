# 什么是 DAT？

DAT (Distributed Access Token) 是一种由共享同一证书的签发服务和验证服务使用的访问令牌规范。验证无需再向签发服务发起请求，也无需中央会话存储，因此可在耦合较松的服务间传递认证结果。

<WireFormat
  hint="由点分隔的字段组成一个 DAT。"
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: '过期 Unix 时间'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: '证书 ID'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: '公开数据'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: '加密数据'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: '正文签名'},
  ]"
/>

## 组成部分

### DAT

用户或服务随请求发送的字符串。它包含有效期和证书 ID，并可同时携带公开数据和加密数据。

### 证书

包含创建和验证 DAT 所需的算法、密钥和时间范围。证书 ID `cid` 不可变；轮换密钥时请使用新的 `cid`。

### 管理器

客户端库的管理器存储证书，用当前可签发的证书创建 DAT，并用与各 DAT 的 `cid` 匹配的证书进行验证。

### DAT CMS

一个可选服务器，用于创建、存储证书并将其分发给服务。它可向签发服务提供完整证书，向仅验证令牌的服务提供仅验证证书。

## 签发与验证

<ArchFlow
  :user="{label: '用户', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['证书管理', '基于版本的同步']}"
  :service="{servers: [
    {label: '签发服务', kind: 'issuer', icon: 'login', request: '凭据', response: 'DAT', sync: '完整证书'},
    {label: '验证服务', kind: 'verifier', icon: 'apps', request: 'DAT', response: '受保护功能', sync: '仅验证证书'},
  ]}"
/>

签发服务选择 `plain` 和 `secure` 数据并创建 DAT。验证服务检查有效期、签名和密文，然后将两个数据区域交给应用。`plain` 已签名但未加密，请勿在其中放入机密或个人数据。

## 证书更改后仍可验证的原因

新证书可签发后，之后的 DAT 使用其新 `cid`。之前的证书在其签发的所有 DAT 的 TTL 结束前仍可用于验证。这样可一并管理密钥轮换和现有令牌的验证期。

## DAT 适用场景

- 认证与应用功能由不同服务处理的环境
- 多种运行时签发或验证同一令牌格式的环境
- 无需中央会话查询即可携带短期授权数据的系统
- 需在同一令牌内分离公开路由信息与受保护数据的系统

DAT 本身不定义授权策略。DAT 有效与应用是否允许请求是两件不同的事。

## 后续步骤

- [DAT 规范](./spec/dat)：令牌字段和验证规则
- [证书](./spec/dat-certificate)：密钥与时间范围
- [DAT CMS 规范](./spec/cms)：同步契约
- [库](./libs/)：应用集成

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
