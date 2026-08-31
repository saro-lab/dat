# DAT란?

DAT(Distributed Access Token)는 발급 서비스와 검증 서비스가 같은 인증서를 공유해 사용하는 액세스 토큰 규격입니다. 검증할 때 발급 서비스나 중앙 세션 저장소에 다시 요청하지 않아도 되므로, 서비스 간 결합을 줄이면서 인증 결과를 전달할 수 있습니다.

<WireFormat
  hint="점으로 구분된 필드가 하나의 DAT를 구성합니다."
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: '만료 Unix time'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: '인증서 ID'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: '공개 데이터'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: '암호화 데이터'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: '본문 서명'},
  ]"
/>

## 구성 요소

### DAT

사용자나 서비스가 요청과 함께 전달하는 문자열입니다. 만료 시각과 인증서 ID를 포함하고, 공개 데이터와 암호화 데이터를 함께 담을 수 있습니다.

### 인증서

DAT를 만들고 확인하는 데 필요한 알고리즘, 키와 시간 범위를 담습니다. 인증서 ID인 `cid`는 바뀌지 않으며, 키를 교체할 때는 새 `cid`를 사용합니다.

### 매니저

클라이언트 라이브러리의 매니저는 인증서를 보관하고, 현재 발급 가능한 인증서로 DAT를 만들며, DAT의 `cid`에 맞는 인증서로 검증합니다.

### DAT CMS

인증서를 생성·보관하고 서비스에 전달하는 선택형 서버입니다. 발급 서비스에는 전체 인증서를, 검증만 하는 서비스에는 검증 전용 인증서를 제공할 수 있습니다.

## 발급과 검증

<ArchFlow
  :user="{label: '사용자', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['인증서 관리', '버전 기반 동기화']}"
  :service="{servers: [
    {label: '발급 서비스', kind: 'issuer', icon: 'login', request: '인증 정보', response: 'DAT', sync: '전체 인증서'},
    {label: '검증 서비스', kind: 'verifier', icon: 'apps', request: 'DAT', response: '보호된 기능', sync: '검증 전용 인증서'},
  ]}"
/>

발급 서비스는 `plain`과 `secure` 데이터를 정하고 DAT를 만듭니다. 검증 서비스는 만료 시각, 서명과 암호문을 확인한 뒤 두 데이터 영역을 애플리케이션에 전달합니다. `plain`은 서명되지만 암호화되지 않으므로 비밀이나 개인정보를 넣지 않습니다.

## 인증서가 바뀌어도 검증되는 이유

새 인증서가 발급 가능해지면 이후 DAT는 새 `cid`를 사용합니다. 이전 인증서는 이미 발급된 DAT의 TTL이 끝날 때까지 검증에 남아 있습니다. 따라서 키 교체와 기존 토큰의 검증 기간을 함께 운영할 수 있습니다.

## 어떤 환경에 맞는가

- 인증과 실제 기능을 서로 다른 서비스가 담당하는 환경
- 여러 런타임이 동일한 토큰을 발급하거나 검증하는 환경
- 중앙 세션 조회 없이 짧은 수명의 권한 정보를 전달하려는 환경
- 공개 라우팅 정보와 보호할 데이터를 하나의 토큰에 분리해 담아야 하는 환경

DAT는 권한 정책 자체를 정의하지 않습니다. DAT가 유효하다는 사실과 애플리케이션이 해당 요청을 허용한다는 판단은 별개입니다.

## 다음 문서

- [DAT 규격](./spec/dat): 토큰 필드와 검증 규칙
- [인증서](./spec/dat-certificate): 키와 시간 범위
- [DAT CMS 규격](./spec/cms): 동기화 계약
- [라이브러리](./libs/): 애플리케이션에 적용하기

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
