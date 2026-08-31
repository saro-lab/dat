# DAT

DAT는 점(`.`)으로 구분한 ASCII 문자열입니다. 필드는 정해진 순서로 한 번씩 나타나며, 서명은 앞의 필드가 전송된 그대로인지 확인합니다.

<WireFormat
  hint="필드 순서와 구분자는 규격의 일부입니다."
  :segments="[
    {name: 'expire', type: 'uint64 (10진수)', kind: 'meta', note: '만료 Unix time'},
    {name: 'cid', type: 'uint64 (16진수)', kind: 'meta', note: '인증서 ID'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: '공개 바이트'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: '암호화 바이트'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: '앞의 네 필드에 대한 서명'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## 필드

| 필드 | 표현 | 의미 |
| --- | --- | --- |
| `expire` | 부호 없는 정수의 10진수 | DAT가 만료되는 Unix time |
| `cid` | 부호 없는 정수의 소문자 16진수 | 검증할 인증서 ID |
| `plain` | 패딩 없는 Base64Url | 암호화하지 않는 바이트 |
| `secure` | 패딩 없는 Base64Url | 인증서의 암호 알고리즘으로 보호한 바이트 |
| `signature` | 패딩 없는 Base64Url | `expire.cid.plain.secure`의 원본 ASCII 바이트에 대한 서명 |

`plain`은 서명 범위에 포함되므로 변조할 수 없지만 누구나 디코딩할 수 있습니다. 비밀, 개인정보와 권한 판단에 직접 사용할 값은 `secure`에 넣습니다. 빈 `secure`도 유효합니다.

## 정규 표현

- DAT 전체는 ASCII여야 합니다.
- 숫자는 부호, 공백, 접두사와 불필요한 앞자리 `0` 없이 표현합니다. 값 `0`만 `0`으로 씁니다.
- Base64Url은 URL-safe 알파벳을 사용하며 `=` 패딩과 공백을 허용하지 않습니다.
- 같은 바이트를 여러 문자열로 표현하는 비정규 Base64Url은 거부합니다.
- 필드 개수와 순서가 다르면 DAT가 아닙니다.

이 규칙은 구현마다 다른 문자열을 같은 DAT로 받아들이는 일을 막습니다.

## 발급

1. 현재 발급 가능한 인증서를 선택합니다.
2. 현재 시각에 인증서의 TTL을 더해 `expire`를 만듭니다.
3. `plain`을 Base64Url로 인코딩합니다.
4. `secure`를 인증서의 암호 알고리즘으로 암호화합니다.
5. 앞의 필드를 점으로 연결한 ASCII 바이트에 서명합니다.

발급은 인증서의 발급 구간 `start <= now <= start + duration`에서만 가능합니다.

## 검증

1. DAT를 정규 규칙에 따라 파싱합니다.
2. `expire > now`인지 확인합니다. `expire == now`는 만료입니다.
3. `cid`에 해당하는 인증서를 찾고 인증서가 검증 가능한지 확인합니다.
4. 원본 `expire.cid.plain.secure` 바이트의 서명을 검증합니다.
5. `secure`를 인증·복호화하고 `plain`과 함께 반환합니다.

서명을 검증하지 않는 파싱 API는 관찰이나 진단에만 사용합니다. 그 결과로 인증하거나 권한을 부여하면 안 됩니다.

## 규격 밖의 책임

DAT는 사용자 저장소, 로그인 방법, 권한 모델, 토큰 전달 헤더와 폐기 목록을 정하지 않습니다. 검증된 payload를 어떤 요청에 허용할지는 애플리케이션이 결정합니다.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
