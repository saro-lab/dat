<template>
  <article>
    <h1>DAT CMS</h1>

    <template v-if="isKorean">
      <p>DAT CMS는 인증서를 생성하고 데이터베이스에 보관하며, 발급 서비스와 검증 서비스에 역할에 맞는 인증서를 전달합니다. 프로토콜 동작은 <a :href="`${root}/spec/cms`">DAT CMS 규격</a>에서 설명합니다.</p>

      <h2>실행 구성 만들기</h2>
      <DatCmsExample />

      <h2>Docker로 실행</h2>
      <p>컨테이너는 일반 사용자 권한으로 실행하고, SQLite를 사용한다면 쓰기 가능한 데이터 디렉터리를 연결합니다. 토큰과 데이터베이스 암호는 명령 기록이 아니라 secret 주입 기능으로 전달합니다.</p>
      <pre><code class="language-shell">docker run --rm --name dat-cms -p 8088:8088 \
  --user 10001:10001 \
  -v "$PWD/dat-cms-data:/data" \
  -e PORT=8088 \
  -e DB_URI='sqlite:/data/data.db' \
  -e TOKEN_MASTER='replace-with-a-secret' \
  -e TOKEN_CERT_FULL='replace-with-a-secret' \
  -e TOKEN_CERT_VERIFY='replace-with-a-secret' \
  sarolab/dat-cms</code></pre>

      <h2>데이터베이스</h2>
      <p><code>DB_URI</code>로 SQLite, PostgreSQL 또는 MySQL 연결을 지정합니다. MariaDB는 MySQL 프로토콜로 연결합니다. CMS는 인증서 조회 결과를 스냅샷으로 캐시하며, 저장소 갱신이 일시적으로 실패하면 마지막으로 성공한 스냅샷을 계속 제공합니다.</p>
      <p><code>DB_CACHE_SECS</code>는 스냅샷 갱신 간격을, <code>DB_QUERY_TIMEOUT_SECS</code>는 갱신 쿼리 제한 시간을 정합니다. 아직 성공한 스냅샷이 없고 저장소를 읽을 수 없다면 서비스는 <code>DAT_STORE_UNAVAILABLE</code>을 반환합니다.</p>

      <h2>접근 역할</h2>
      <table>
        <thead><tr><th>환경 변수</th><th>권한</th><th>사용 대상</th></tr></thead>
        <tbody>
          <tr><td><code>TOKEN_MASTER</code></td><td>인증서 등록과 보호된 버전 조회</td><td>운영 작업</td></tr>
          <tr><td><code>TOKEN_CERT_FULL</code></td><td>전체 인증서 조회</td><td>DAT 발급 서비스</td></tr>
          <tr><td><code>TOKEN_CERT_VERIFY</code></td><td>검증 전용 인증서 조회</td><td>검증·복호화 서비스</td></tr>
        </tbody>
      </table>
      <p>각 변수에는 쉼표로 구분한 영문자·숫자 토큰을 넣을 수 있습니다. 역할의 토큰 목록을 비우면 그 역할의 엔드포인트가 열리고 경고가 기록됩니다.</p>

      <h2>인증서 생성</h2>
      <p>master 역할은 서명 알고리즘, 암호 알고리즘, 전파 대기 시간, 발급 기간과 TTL을 지정해 인증서를 등록합니다. 전파 대기 시간 동안 서비스가 새 인증서를 먼저 동기화하고, 그 뒤 새 인증서가 발급 가능해집니다.</p>

      <h2>클라이언트 연결</h2>
      <ol>
        <li>발급 서비스에는 full 토큰과 전체 인증서 엔드포인트를 사용합니다.</li>
        <li>검증 서비스에는 verify 토큰과 verify-only 옵션을 사용합니다.</li>
        <li>첫 동기화 결과를 확인하고, 시작 실패가 필요하면 즉시 동기화 API를 호출합니다.</li>
        <li>자동 동기화를 사용하면 애플리케이션 종료 시 매니저를 닫습니다.</li>
      </ol>
      <p>언어별 builder와 종료 방식은 <a :href="`${root}/libs/`">라이브러리 문서</a>에서 확인합니다.</p>

      <h2>운영 확인</h2>
      <ul>
        <li><code>/health</code>와 <code>/version/api</code>는 인증 없이 상태를 확인합니다.</li>
        <li><code>/version</code>은 master 역할이 설정되어 있으면 해당 토큰이 필요합니다.</li>
        <li>로그는 표준 출력과 표준 오류로 수집합니다.</li>
        <li>종료 신호를 전달하고 데이터베이스와 스케줄러가 닫힐 시간을 둡니다.</li>
      </ul>

      <h2>Kubernetes</h2>
      <p>컨테이너 포트와 probe를 서비스 포트에 맞추고, 데이터 디렉터리를 일반 사용자에게 쓰기 가능하게 연결합니다. 토큰과 데이터베이스 접속 정보는 Secret으로 주입합니다.</p>
      <pre><code class="language-yaml">securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  runAsGroup: 10001
containers:
  - name: dat-cms
    image: sarolab/dat-cms
    ports: [{ containerPort: 8088 }]
    readinessProbe: { httpGet: { path: /health, port: 8088 } }
    livenessProbe: { httpGet: { path: /health, port: 8088 } }</code></pre>
    </template>

    <template v-else-if="isEnglish">
      <p>DAT CMS creates certificates, stores them in a database, and delivers the appropriate certificates to issuing and verifying services. Protocol behavior is described in the <a :href="`${root}/spec/cms`">DAT CMS specification</a>.</p>

      <h2>Create a runtime configuration</h2>
      <DatCmsExample />

      <h2>Run with Docker</h2>
      <p>Run the container as a non-root user. When using SQLite, mount a writable data directory. Pass tokens and database passwords through a secret-injection mechanism rather than command history.</p>
      <pre><code class="language-shell">docker run --rm --name dat-cms -p 8088:8088 \
  --user 10001:10001 \
  -v "$PWD/dat-cms-data:/data" \
  -e PORT=8088 \
  -e DB_URI='sqlite:/data/data.db' \
  -e TOKEN_MASTER='replace-with-a-secret' \
  -e TOKEN_CERT_FULL='replace-with-a-secret' \
  -e TOKEN_CERT_VERIFY='replace-with-a-secret' \
  sarolab/dat-cms</code></pre>

      <h2>Database</h2>
      <p>Use <code>DB_URI</code> to configure a SQLite, PostgreSQL, or MySQL connection. MariaDB connects through the MySQL protocol. CMS caches certificate query results as a snapshot and continues serving the last successful snapshot when a storage refresh fails temporarily.</p>
      <p><code>DB_CACHE_SECS</code> sets the snapshot refresh interval, while <code>DB_QUERY_TIMEOUT_SECS</code> limits refresh queries. If no successful snapshot exists and storage cannot be read, the service returns <code>DAT_STORE_UNAVAILABLE</code>.</p>

      <h2>Access roles</h2>
      <table>
        <thead><tr><th>Environment variable</th><th>Permission</th><th>Used by</th></tr></thead>
        <tbody>
          <tr><td><code>TOKEN_MASTER</code></td><td>Register certificates and retrieve the protected version</td><td>Operations</td></tr>
          <tr><td><code>TOKEN_CERT_FULL</code></td><td>Retrieve full certificates</td><td>DAT issuing services</td></tr>
          <tr><td><code>TOKEN_CERT_VERIFY</code></td><td>Retrieve verify-only certificates</td><td>Verification and decryption services</td></tr>
        </tbody>
      </table>
      <p>Each variable accepts comma-separated alphanumeric tokens. If a role's token list is empty, that role's endpoints are opened and a warning is logged.</p>

      <h2>Certificate generation</h2>
      <p>The master role registers a certificate by specifying the signature algorithm, encryption algorithm, propagation delay, issuance period, and TTL. During the propagation delay, services synchronize the new certificate before it becomes issuable.</p>

      <h2>Client integration</h2>
      <ol>
        <li>Use the full token and full-certificate endpoint for issuing services.</li>
        <li>Use the verify token and verify-only option for verifying services.</li>
        <li>Check the result of the first synchronization; if startup must fail, call the immediate synchronization API.</li>
        <li>When automatic synchronization is enabled, close the manager during application shutdown.</li>
      </ol>
      <p>See the <a :href="`${root}/libs/`">library guides</a> for each language's builder and shutdown behavior.</p>

      <h2>Operational checks</h2>
      <ul>
        <li><code>/health</code> and <code>/version/api</code> report status without authentication.</li>
        <li><code>/version</code> requires the master token when that role is configured.</li>
        <li>Collect logs from standard output and standard error.</li>
        <li>Forward shutdown signals and allow time for the database and scheduler to close.</li>
      </ul>

      <h2>Kubernetes</h2>
      <p>Match the container port and probes to the service port, and mount the data directory with write access for the non-root user. Inject tokens and database connection details through Secrets.</p>
      <pre><code class="language-yaml">securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  runAsGroup: 10001
containers:
  - name: dat-cms
    image: sarolab/dat-cms
    ports: [{ containerPort: 8088 }]
    readinessProbe: { httpGet: { path: /health, port: 8088 } }
    livenessProbe: { httpGet: { path: /health, port: 8088 } }</code></pre>
    </template>

    <template v-else>
      <p>{{ sharedText.cms.introBefore }}<a :href="`${root}/spec/cms`">{{ sharedText.cms.specLink }}</a>{{ sharedText.cms.introAfter }}</p>

      <h2>{{ sharedText.cms.configTitle }}</h2>
      <DatCmsExample />

      <h2>{{ sharedText.cms.dockerTitle }}</h2>
      <p v-html="renderInline(sharedText.cms.dockerBody)" />
      <pre><code class="language-shell">docker run --rm --name dat-cms -p 8088:8088 \
  --user 10001:10001 \
  -v "$PWD/dat-cms-data:/data" \
  -e PORT=8088 \
  -e DB_URI='sqlite:/data/data.db' \
  -e TOKEN_MASTER='replace-with-a-secret' \
  -e TOKEN_CERT_FULL='replace-with-a-secret' \
  -e TOKEN_CERT_VERIFY='replace-with-a-secret' \
  sarolab/dat-cms</code></pre>

      <h2>{{ sharedText.cms.databaseTitle }}</h2>
      <p v-html="renderInline(sharedText.cms.databaseBody1)" />
      <p v-html="renderInline(sharedText.cms.databaseBody2)" />

      <h2>{{ sharedText.cms.rolesTitle }}</h2>
      <table>
        <thead><tr><th v-for="header in sharedText.cms.roleHeaders" :key="header">{{ header }}</th></tr></thead>
        <tbody>
          <tr><td><code>TOKEN_MASTER</code></td><td>{{ sharedText.cms.roleRows[0][0] }}</td><td>{{ sharedText.cms.roleRows[0][1] }}</td></tr>
          <tr><td><code>TOKEN_CERT_FULL</code></td><td>{{ sharedText.cms.roleRows[1][0] }}</td><td>{{ sharedText.cms.roleRows[1][1] }}</td></tr>
          <tr><td><code>TOKEN_CERT_VERIFY</code></td><td>{{ sharedText.cms.roleRows[2][0] }}</td><td>{{ sharedText.cms.roleRows[2][1] }}</td></tr>
        </tbody>
      </table>
      <p v-html="renderInline(sharedText.cms.rolesNote)" />

      <h2>{{ sharedText.cms.certificateTitle }}</h2>
      <p v-html="renderInline(sharedText.cms.certificateBody)" />

      <h2>{{ sharedText.cms.clientTitle }}</h2>
      <ol>
        <li v-for="step in sharedText.cms.clientSteps" :key="step" v-html="renderInline(step)" />
      </ol>
      <p>{{ sharedText.cms.libraryBefore }}<a :href="`${root}/libs/`">{{ sharedText.cms.libraryLink }}</a>{{ sharedText.cms.libraryAfter }}</p>

      <h2>{{ sharedText.cms.operationsTitle }}</h2>
      <ul>
        <li v-for="item in sharedText.cms.operationsItems" :key="item" v-html="renderInline(item)" />
      </ul>

      <h2>{{ sharedText.cms.kubernetesTitle }}</h2>
      <p v-html="renderInline(sharedText.cms.kubernetesBody)" />
      <pre><code class="language-yaml">securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  runAsGroup: 10001
containers:
  - name: dat-cms
    image: sarolab/dat-cms
    ports: [{ containerPort: 8088 }]
    readinessProbe: { httpGet: { path: /health, port: 8088 } }
    livenessProbe: { httpGet: { path: /health, port: 8088 } }</code></pre>
    </template>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import DatCmsExample from './DatCmsExample.vue'
import { useRoot } from '../src/langs'
import { getGuideLocale } from '../src/guideLocales'

const { localeIndex } = useData()
const isKorean = computed(() => localeIndex.value === 'ko')
const isEnglish = computed(() => localeIndex.value === 'en')
const root = useRoot()
const sharedText = computed(() => getGuideLocale(localeIndex.value))

function renderInline(value: string): string {
  return value.replace(/`([^`]+)`/g, '<code>$1</code>')
}
</script>
