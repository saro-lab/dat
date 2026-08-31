# 인증서

DAT 인증서는 토큰을 발급하고 검증하는 데 필요한 시간 범위, 알고리즘과 키를 하나의 문자열로 표현합니다.

<WireFormat
  hint="인증서도 점으로 구분된 고정 순서의 ASCII 필드입니다."
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: '불변 인증서 ID'},
    {name: 'start', type: 'uint64', kind: 'meta', note: '발급 시작 시각'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: '발급 가능 기간'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'DAT 유효 시간'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: '서명 알고리즘'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: '암호 알고리즘'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: '서명 또는 검증 키'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: '암호화 키'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## 시간 범위

<CertTimeline />

- 인증서는 `start`부터 `start + duration`까지 DAT를 발급할 수 있습니다. 양 끝 시각을 포함합니다.
- 발급된 DAT는 발급 시각부터 `ttl` 동안 유효합니다.
- 인증서는 `start + duration + ttl`까지 검증에 필요합니다. 정확히 그 시각에도 인증서는 검증 가능합니다.

발급 기간이 끝났다고 인증서를 즉시 삭제하면 이미 발급한 DAT를 검증할 수 없습니다. 매니저와 CMS는 발급 가능 여부와 검증 가능 여부를 따로 취급합니다.

## 인증서 ID와 키 교체

`cid`는 키와 시간 범위를 식별하는 공개 계약입니다. 기존 `cid`에 다른 키를 덮어쓰지 않습니다. 키를 교체할 때는 새 인증서를 만들고 새 `cid`를 사용합니다. 서비스는 새 인증서를 미리 동기화하고, 이전 인증서는 그 인증서로 발급한 DAT가 모두 만료된 뒤 제거합니다.

## 서명 알고리즘

| 이름 | 용도 | 검증 전용 인증서 |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | 지원하지 않음 |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | 지원하지 않음 |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | 지원하지 않음 |
| `ECDSA-P256` | ECDSA P-256 | 지원 |
| `ECDSA-P384` | ECDSA P-384 | 지원 |
| `ECDSA-P521` | ECDSA P-521 | 지원 |

HMAC은 같은 키로 서명과 검증을 하므로 검증 서버에 키를 주면 발급도 가능합니다. 발급 권한을 분리해야 하는 환경에서는 ECDSA와 검증 전용 인증서를 사용합니다.

## 암호 알고리즘

| 이름 | 키 |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

알고리즘 이름은 와이어 계약입니다. JWT에서 사용하는 별칭으로 바꾸지 않습니다.

## 전체 인증서와 검증 전용 인증서

전체 ECDSA 인증서에는 서명에 필요한 개인 키가 포함됩니다. 검증 전용 인증서는 ECDSA 공개 키만 남기지만 `secure` 복호화에 필요한 AES 키는 유지합니다. 따라서 검증 전용 서비스는 DAT를 확인하고 복호화할 수 있지만 새 DAT를 발급할 수 없습니다.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
