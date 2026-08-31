<template>
  <article>
    <h1>DAT {{ guide.title }} {{ isKorean ? '라이브러리' : isEnglish ? 'Library' : sharedText.library.titleSuffix }}</h1>

    <template v-if="isKorean">
      <GithubBadge label="GitHub" /> <RegistryBadge />

      <h2>설치</h2>
      <LibUnit v-if="lib" :lib="lib" class="no-title" />

      <blockquote v-if="guideKey === 'c'">
        <p>
          Until it is officially merged into vcpkg, you will need to manually install and integrate the project using this repository.<br>
          <a href="https://github.com/microsoft/vcpkg/pull/52088">https://github.com/microsoft/vcpkg/pull/52088</a><br>
          version: {{ lib?.version }}
        </p>
      </blockquote>

      <h2>빠르게 사용하기</h2>
      <p>CMS에서 인증서를 받은 뒤 JSON 데이터를 담아 DAT를 만들고 다시 검증하는 전체 흐름입니다.</p>
      <CodeBox :lang="guide.language" :code="guide.quick" />

      <h2>차근차근 사용하기</h2>

      <h3>1. CMS 연결</h3>
      <p>발급 서비스는 전체 인증서용 토큰을 사용합니다. 시작 시 즉시 동기화하면 인증서가 없는 상태에서 발급하는 일을 막을 수 있습니다.</p>
      <CodeBox :lang="guide.language" :code="guide.connect" />

      <h3>2. DAT 발급</h3>
      <p><code>plain</code>에는 공개 가능한 JSON을, <code>secure</code>에는 보호할 사용자 정보를 JSON으로 넣었습니다.</p>
      <CodeBox :lang="guide.language" :code="guide.issue" />

      <h3>3. DAT 검증</h3>
      <p><code>parse</code>는 만료와 서명을 확인하고 <code>secure</code>를 복호화합니다. 검증이 끝난 payload만 사용합니다.</p>
      <CodeBox :lang="guide.language" :code="guide.parse" />

      <h3>주요 함수</h3>
      <table>
        <thead><tr><th>함수</th><th>용도</th></tr></thead>
        <tbody>
          <tr v-for="item in guide.api" :key="item.name">
            <td><code>{{ item.name }}</code></td>
            <td>{{ item.purpose }}</td>
          </tr>
        </tbody>
      </table>

      <h3>데이터 구분</h3>
      <ul>
        <li><code>plain</code>: 서명되지만 암호화되지 않는 바이트입니다.</li>
        <li><code>secure</code>: 암호화되는 바이트입니다.</li>
        <li><code>payload</code>: <code>parse</code>가 성공한 뒤에만 신뢰합니다.</li>
      </ul>

      <h3>JSON 외의 선택지</h3>
      <p>예제는 익숙한 JSON을 사용했습니다. 더 빠른 처리가 필요하면 바이너리를 사용해 JSON 직렬화와 파싱을 생략하고 데이터 크기도 줄일 수 있습니다.</p>
      <p>간단한 값은 텍스트로, 구조화된 데이터는 Protobuf·MessagePack 같은 바이너리 형식으로 <code>plain</code>과 <code>secure</code>에 담을 수 있습니다.</p>
      <CodeBox :lang="guide.language" :code="guide.binary" />
      <p v-html="renderInline(guide.binaryNote)" />

      <h3>검증 전용 서비스</h3>
      <p>DAT를 발급하지 않는 서비스는 verify-only 옵션과 검증 전용 토큰을 사용하고 <code>parse</code>만 호출합니다.</p>

      <h3>종료와 오류</h3>
      <p v-html="renderInline(guide.lifecycle)" />
      <p>오류 메시지 대신 <a :href="`${root}/spec/errors`">오류 코드와 재시도 분류</a>를 사용합니다.</p>
    </template>

    <template v-else-if="isEnglish">
      <GithubBadge label="GitHub" /> <RegistryBadge />

      <h2>Installation</h2>
      <LibUnit v-if="lib" :lib="lib" class="no-title" />

      <blockquote v-if="guideKey === 'c'">
        <p>
          Until it is officially merged into vcpkg, you will need to manually install and integrate the project using this repository.<br>
          <a href="https://github.com/microsoft/vcpkg/pull/52088">https://github.com/microsoft/vcpkg/pull/52088</a><br>
          version: {{ lib?.version }}
        </p>
      </blockquote>

      <h2>Quick start</h2>
      <p>This complete flow retrieves certificates from CMS, creates a DAT containing JSON data, and verifies it.</p>
      <CodeBox :lang="guide.language" :code="guide.quick" />

      <h2>Step by step</h2>

      <h3>1. Connect to CMS</h3>
      <p>An issuing service uses a token for full certificates. Synchronizing immediately at startup prevents issuance before certificates are available.</p>
      <CodeBox :lang="guide.language" :code="guide.connect" />

      <h3>2. Issue a DAT</h3>
      <p>This example puts public JSON in <code>plain</code> and protected user information as JSON in <code>secure</code>.</p>
      <CodeBox :lang="guide.language" :code="guide.issue" />

      <h3>3. Verify a DAT</h3>
      <p><code>parse</code> checks expiration and the signature, then decrypts <code>secure</code>. Use only a payload returned after successful verification.</p>
      <CodeBox :lang="guide.language" :code="guide.parseEn ?? guide.parse" />

      <h3>Key functions</h3>
      <table>
        <thead><tr><th>Function</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr v-for="item in guide.api" :key="item.name">
            <td><code>{{ item.name }}</code></td>
            <td>{{ item.purposeEn }}</td>
          </tr>
        </tbody>
      </table>

      <h3>Data regions</h3>
      <ul>
        <li><code>plain</code>: bytes that are signed but not encrypted.</li>
        <li><code>secure</code>: encrypted bytes.</li>
        <li><code>payload</code>: trust it only after <code>parse</code> succeeds.</li>
      </ul>

      <h3>Options beyond JSON</h3>
      <p>The examples use familiar JSON. For faster processing, binary data can avoid JSON serialization and parsing while reducing data size.</p>
      <p>Store simple values as text, or place structured data in binary formats such as Protobuf or MessagePack in <code>plain</code> and <code>secure</code>.</p>
      <CodeBox :lang="guide.language" :code="guide.binaryEn ?? guide.binary" />
      <p v-html="renderInline(guide.binaryNoteEn)" />

      <h3>Verify-only services</h3>
      <p>A service that does not issue DATs uses the verify-only option and a verify-only token, and calls only <code>parse</code>.</p>

      <h3>Shutdown and errors</h3>
      <p v-html="renderInline(guide.lifecycleEn)" />
      <p>Use <a :href="`${root}/spec/errors`">error codes and retry classifications</a> instead of error messages.</p>
    </template>

    <template v-else>
      <GithubBadge label="GitHub" /> <RegistryBadge />

      <h2>{{ sharedText.library.install }}</h2>
      <LibUnit v-if="lib" :lib="lib" class="no-title" />

      <blockquote v-if="guideKey === 'c'">
        <p>
          Until it is officially merged into vcpkg, you will need to manually install and integrate the project using this repository.<br>
          <a href="https://github.com/microsoft/vcpkg/pull/52088">https://github.com/microsoft/vcpkg/pull/52088</a><br>
          version: {{ lib?.version }}
        </p>
      </blockquote>

      <h2>{{ sharedText.library.quickTitle }}</h2>
      <p v-html="renderInline(sharedText.library.quickIntro)" />
      <CodeBox :lang="guide.language" :code="guide.quick" />

      <h2>{{ sharedText.library.stepTitle }}</h2>

      <h3>{{ sharedText.library.connectTitle }}</h3>
      <p v-html="renderInline(sharedText.library.connectBody)" />
      <CodeBox :lang="guide.language" :code="guide.connect" />

      <h3>{{ sharedText.library.issueTitle }}</h3>
      <p v-html="renderInline(sharedText.library.issueBody)" />
      <CodeBox :lang="guide.language" :code="guide.issue" />

      <h3>{{ sharedText.library.parseTitle }}</h3>
      <p v-html="renderInline(sharedText.library.parseBody)" />
      <CodeBox :lang="guide.language" :code="sharedGuide.parse ?? guide.parse" />

      <h3>{{ sharedText.library.functionsTitle }}</h3>
      <table>
        <thead><tr><th>{{ sharedText.library.functionHeader }}</th><th>{{ sharedText.library.purposeHeader }}</th></tr></thead>
        <tbody>
          <tr v-for="(item, index) in guide.api" :key="item.name">
            <td><code>{{ item.name }}</code></td>
            <td>{{ sharedGuide.apiPurposes[index] }}</td>
          </tr>
        </tbody>
      </table>

      <h3>{{ sharedText.library.dataTitle }}</h3>
      <ul>
        <li><code>plain</code>: {{ sharedText.library.plainBody }}</li>
        <li><code>secure</code>: {{ sharedText.library.secureBody }}</li>
        <li><code>payload</code>: <span v-html="renderInline(sharedText.library.payloadBody)" /></li>
      </ul>

      <h3>{{ sharedText.library.optionsTitle }}</h3>
      <p v-html="renderInline(sharedText.library.optionsBody)" />
      <p v-html="renderInline(sharedText.library.formatsBody)" />
      <CodeBox :lang="guide.language" :code="sharedGuide.binary ?? guide.binary" />
      <p v-html="renderInline(sharedGuide.binaryNote)" />

      <h3>{{ sharedText.library.verifyTitle }}</h3>
      <p v-html="renderInline(sharedText.library.verifyBody)" />

      <h3>{{ sharedText.library.lifecycleTitle }}</h3>
      <p v-html="renderInline(sharedGuide.lifecycle)" />
      <p>{{ sharedText.library.errorsBefore }}<a :href="`${root}/spec/errors`">{{ sharedText.library.errorsLink }}</a>{{ sharedText.library.errorsAfter }}</p>
    </template>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import GithubBadge from './GithubBadge.vue'
import RegistryBadge from './RegistryBadge.vue'
import LibUnit from './LibUnit.vue'
import CodeBox from './CodeBox.vue'
import { findLibrary } from '../src/libs'
import { libraryGuides } from '../src/libraryGuides'
import { useRoot } from '../src/langs'
import { getGuideLocale } from '../src/guideLocales'

const props = defineProps<{ guideKey: keyof typeof libraryGuides }>()
const guide = libraryGuides[props.guideKey]
const lib = findLibrary(guide.repository, guide.packageId)
const root = useRoot()
const { localeIndex } = useData()
const isKorean = computed(() => localeIndex.value === 'ko')
const isEnglish = computed(() => localeIndex.value === 'en')
const sharedText = computed(() => getGuideLocale(localeIndex.value))
const sharedGuide = computed(() => sharedText.value.guides[props.guideKey] ?? sharedText.value.guides.rust)

function renderInline(value: string): string {
  return value.replace(/`([^`]+)`/g, '<code>$1</code>')
}
</script>
