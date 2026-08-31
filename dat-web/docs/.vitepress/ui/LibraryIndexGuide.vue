<template>
  <article>
    <h1>{{ isKorean ? '라이브러리' : isEnglish ? 'Libraries' : sharedText.libraryIndex.title }}</h1>
    <template v-if="isKorean">
      <p>애플리케이션의 언어에 맞는 DAT 클라이언트를 선택합니다. 모든 클라이언트는 같은 DAT와 인증서 규격을 사용하며, 로컬 인증서 관리와 DAT CMS 동기화를 제공합니다.</p>
      <LibraryList />
      <h2>선택 기준</h2>
      <p>서비스가 DAT를 발급한다면 전체 인증서를 사용할 수 있어야 합니다. 검증과 복호화만 담당한다면 ECDSA 검증 전용 인증서와 CMS의 verify-only 역할을 사용합니다.</p>
      <h2>문서 흐름</h2>
      <p>각 라이브러리 문서는 설치, 가장 단순한 발급·검증, DAT CMS 연결, 동기화 정책, 종료와 오류 처리 순서로 설명합니다.</p>
    </template>
    <template v-else-if="isEnglish">
      <p>Select the DAT client for your application's language. Every client uses the same DAT and certificate specifications, and provides local certificate management and DAT CMS synchronization.</p>
      <LibraryList />
      <h2>How to choose</h2>
      <p>A service that issues DATs must be able to use full certificates. A service that only verifies and decrypts should use ECDSA verify-only certificates and the CMS verify-only role.</p>
      <h2>Guide structure</h2>
      <p>Each library guide covers installation, the simplest issuance and verification flow, DAT CMS connection, synchronization policy, shutdown, and error handling.</p>
    </template>
    <template v-else>
      <p>{{ sharedText.libraryIndex.intro }}</p>
      <LibraryList />
      <h2>{{ sharedText.libraryIndex.criteriaTitle }}</h2>
      <p>{{ sharedText.libraryIndex.criteriaBody }}</p>
      <h2>{{ sharedText.libraryIndex.flowTitle }}</h2>
      <p>{{ sharedText.libraryIndex.flowBody }}</p>
    </template>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import LibraryList from './LibraryList.vue'
import { getGuideLocale } from '../src/guideLocales'

const { localeIndex } = useData()
const isKorean = computed(() => localeIndex.value === 'ko')
const isEnglish = computed(() => localeIndex.value === 'en')
const sharedText = computed(() => getGuideLocale(localeIndex.value))
</script>
