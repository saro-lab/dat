# CMS 동기화와 인증서 운영

## 1. 개요

**DAT CMS(Certificate Management Service)**는 클러스터 전체가 공유할 인증서를 생성하고 배포하는 서버입니다.

각 애플리케이션은 CMS 클라이언트(`DatCmsManager`)를 통해 주기적으로 인증서 목록을 받아 가며, 이 동기화가 **키 롤링을 자동화**합니다. 운영자가 키를 직접 교체하지 않아도 인증서가 정해진 주기로 새로 생성되고 오래된 것은 스스로 만료됩니다.

<ArchFlow
    :user="{label: '유저', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['유효 기간별 인증서 생성', '만료 인증서 정리']}"
    :service="{servers: [
        {label: '로그인 서버', kind: 'issuer', icon: 'login',
         request: '로그인 요청', response: '인증서로 DAT 발급', sync: 'DAT 발급 가능 인증서 동기화'},
        {label: '컨텐츠 서버', kind: 'verifier', icon: 'apps',
         request: 'DAT로 컨텐츠 요청', response: 'DAT 검증 후 서비스 제공', sync: 'DAT 검증 전용 인증서 동기화'},
    ]}"
/>

로그인 서버만 발급 가능한 인증서를 받아 DAT를 발급하고, 컨텐츠 서버는 검증 전용 인증서만 받아 들어온 DAT를 확인합니다. **컨텐츠 서버는 CMS만 알면 되고 로그인 서버를 알 필요가 없습니다.**

---

## 2. 동기화 프로토콜

### 2.1. 요청과 응답

<FlowDiagram
    title="동기화 한 주기"
    :legend="{req: '요청', res: '응답', sync: '인증서 동기화'}"
    :actors="[
        {id: 'app', label: '애플리케이션', kind: 'issuer'},
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
    ]"
    :steps="[
        {from: 'app', label: '보유 version = N', kind: 'note'},
        {from: 'app', to: 'cms', label: 'GET /v1/certs?version=N (Authorization: 토큰)', kind: 'req'},
        {from: 'cms', label: '서버 version = M, N보다 새 인증서를 선별', kind: 'note'},
        {from: 'cms', to: 'app', label: '1행: M / 2행~: 인증서 목록', kind: 'res'},
        {from: 'app', label: '목록이 비어 있으면 version 유지 후 종료', kind: 'note'},
        {from: 'app', label: 'import(clear = true) 성공 시에만 version = M', kind: 'note'},
    ]"
/>

| 엔드포인트 | 용도 |
| --- | --- |
| `GET /v1/certs?version=N` | 전체 인증서 (서명 개인키 포함) |
| `GET /v1/certs/verify-only?version=N` | 검증 전용 인증서 |
| `GET /v1/certs.json`, `/v1/certs/verify-only.json` | 같은 내용의 JSON 형식 |
| `POST /v1/cert/{sig-alg}/{crypto-alg}/{delay}/{duration}/{ttl}` | 인증서 수동 생성 (Master 토큰 필요) |
| `GET /health` | 상태 확인 |

응답 본문은 **첫 줄이 서버의 현재 version**, 그 다음 줄부터 인증서가 한 줄에 하나씩 들어 있는 평문입니다.

```
1712345678
1a.1712345000.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
2b.1712348600.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
```

### 2.2. 버전 커서

클라이언트는 마지막으로 성공한 version을 기억하고 다음 요청에 실어 보냅니다. 서버는 그 값보다 새로운 인증서만 골라 돌려줍니다.

* 클라이언트 version이 **서버보다 과거**이면 → 그 이후에 생긴 인증서만 돌려줍니다.
* 클라이언트 version이 **서버보다 미래**이면(서버 교체·DB 초기화 등) → 커서를 `0`으로 되돌려 **전체 세트**를 돌려줍니다.
* 클라이언트는 **가져오기에 성공한 경우에만** version을 전진시킵니다. 실패한 응답으로 커서가 넘어가 인증서를 영구히 놓치는 상황을 막기 위함입니다.

::: tip 증분 요청이지만 응답은 전체 교체입니다
`?version=N`은 "N 이후의 변경분을 달라"는 요청이지만, 클라이언트는 받은 목록을 **기존 목록과 병합하지 않고 교체(clear = true)** 합니다. 서버가 유효한 인증서 전체를 항상 판단해서 내려주기 때문이며, 이 방식 덕분에 CMS에서 폐기(revoke)된 인증서가 클라이언트에 남아 있지 않습니다.
:::

### 2.3. 인증 토큰

CMS는 세 종류의 토큰으로 접근을 나눕니다.

| 토큰 | 권한 |
| --- | --- |
| `{{t('master_token')}}` | {{t('master_token_desc')}} |
| `{{t('full_cert_token')}}` | {{t('full_cert_token_desc')}} |
| `{{t('verify_cert_token')}}` | {{t('verify_cert_token_desc')}} |

검증만 하는 서버에는 Verify Cert 토큰만 주는 것이 원칙입니다. 다만 암호화 키는 verify-only 응답에도 포함되므로, 그 의미는 [{{t('menu_spec_cert')}}](./dat-certificate#_5-verify-only-내보내기) 문서의 주의사항을 함께 확인하십시오.

---

## 3. 인증서 발급 지연 (delay)

새 인증서를 만들자마자 발급에 쓰면, 아직 동기화하지 않은 다른 노드가 그 인증서로 서명된 토큰을 검증하지 못합니다. **발급 지연**은 이 구간을 없애기 위한 값입니다.

<CertTimeline
    title="지연 구간이 하는 일"
    caption="지연 구간 동안 모든 노드가 인증서를 받아 가고, 그 뒤에야 발급이 시작됩니다."
    :marks="['생성', '발급 시작', '발급 종료', '최종 만료']"
    :phases="[
        {label: '발급 지연', weight: 1.2, kind: 'delay', note: '전 노드 동기화 대기'},
        {label: '발급 가능', weight: 3, kind: 'issue', note: '발급 + 검증'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: '검증만'},
    ]"
/>

예를 들어 CMS가 인증서 A를 만들고 서버 1·2가 60초 주기로 동기화한다고 가정합니다. 서버 1이 먼저 받아 A로 DAT를 발급했는데 서버 2가 아직 받지 못했다면, 서버 2는 그 DAT를 검증하지 못합니다.

지연을 180초로 두면 인증서 생성 후 180초 동안은 발급이 불가능한 상태로 남고, 그 사이 모든 서버가 안전하게 동기화를 마칩니다. 일시적인 네트워크 오류를 감안해 **각 서버의 동기화 주기보다 최소 3~4배 이상** 크게 설정하는 것을 권장합니다.

---

## 4. 의도된 동작

아래 동작들은 모두 **설계상 의도된 것**이며 결함이 아닙니다. 운영 시 예상과 다르게 보일 수 있어 명시합니다.

### 4.1. 발급 창이 닫힌 뒤에도 캐시된 인증서로 계속 서명합니다

애플리케이션은 동기화 시점에 고른 발급용 인증서를 계속 사용하며, 매 발급마다 `issuable()`을 다시 확인하지 않습니다.

**이유:** CMS와의 연결이 끊긴 상태에서 발급 창이 닫히면, 재확인 방식에서는 그 순간 **서비스 전체의 로그인이 멈춥니다.** DAT는 이 경우 "새 인증서를 못 받았더라도 일단 발급은 계속한다"를 선택했습니다.

**대가:** 네트워크 장애가 길어지면 이미 발급 창이 지난 인증서로 토큰이 계속 나갈 수 있습니다. 다만 그 토큰도 인증서 최종 만료 전까지는 다른 노드에서 정상 검증되므로, 장애 상황에서 서비스가 죽는 것보다 낫다고 판단한 트레이드오프입니다.

### 4.2. 같은 CID로 갱신된 인증서는 버려집니다

이미 보유한 CID와 같은 CID의 인증서가 들어오면 **새로 들어온 쪽을 무시**합니다.

**이유:** CID는 인증서의 불변 식별자입니다. 같은 CID가 서로 다른 키를 가리키게 되면, 이미 발급되어 돌아다니는 토큰이 어느 키로 검증되어야 하는지 알 수 없게 됩니다.

::: warning 키 교체는 반드시 새 CID로
같은 CID를 유지한 채 키만 바꿔 배포하면 **클라이언트에 영원히 반영되지 않고 오류도 나지 않습니다.** 키를 교체할 때는 새 CID의 인증서를 발행하십시오.
:::

### 4.3. 새 인증서가 없으면 기존 목록을 유지합니다

응답에 인증서가 하나도 없으면 클라이언트는 **보유 목록을 그대로 둡니다.** 목록을 비우지 않습니다.

**이유:** 인증서 서버가 다운되었거나 응답이 비정상인 최악의 순간에 보유 인증서를 비워 버리면, 그 즉시 **모든 토큰 검증이 실패**합니다. 새로 받은 것이 없으면 있던 것으로 버티는 편이 안전합니다.

### 4.4. SINGLE_NODE 모드는 기동할 때마다 인증서를 생성합니다

CMS를 단일 노드 모드로 실행하면 발급 가능한 인증서의 존재 여부와 무관하게 **매 기동 시 인증서를 하나 만듭니다.**

**이유:** 단일 노드 모드는 CMS를 별도 인프라 없이 독립적으로 띄워 쓰기 위한 구성입니다. 기동 직후 바로 발급 가능한 인증서가 있어야 합니다.

**주의:** 재시작이 반복되면 인증서가 계속 쌓입니다. 다만 각 인증서는 자기 만료 시각이 지나면 목록에서 제외되므로 무한히 늘어나지는 않습니다.

### 4.5. 발급 가능한 인증서가 없으면 지연 없이 즉시 발급됩니다

인증서를 생성하는 시점에 발급 가능한 인증서가 하나도 없으면, CMS는 **지연 구간을 건너뛰고** 지연 시간을 발급 기간에 합쳐 넣습니다.

**이유:** 지연을 지키면 그 시간 동안 클러스터 전체가 토큰을 하나도 발급하지 못합니다. 최초 기동이나 전체 장애 복구 상황에서는 즉시 발급이 가능해야 합니다. 이때 서버 로그에 경고가 남습니다.

---

## 5. 인증서 회수와 만료

* 인증서는 **최종 만료(`start + duration + ttl`) 시점까지** 배포 목록에 남습니다. 발급 창이 닫혔다고 바로 사라지지 않습니다.
* 발급 창 종료 직전에 나간 DAT는 자기 TTL만큼 더 살아 있으므로, 그 시점 이후에 처음 부팅한 검증 서버도 인증서를 받아 해당 토큰을 검증할 수 있습니다.
* 최종 만료가 지난 인증서는 목록에서 빠지고, 이후 정리 작업에서 저장소에서도 제거됩니다.

---

## 6. 배포

CMS 서버의 실행 옵션, Docker · Kubernetes · 바이너리 배포 방법과 환경 변수는 별도 문서에서 다룹니다.

- [{{t('menu_svc_cms')}} 배포 가이드](../svc/docker-saro-lab-dat-cms)

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import ArchFlow from "../../.vitepress/ui/ArchFlow.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
const {t} = useTranslate();
</script>
