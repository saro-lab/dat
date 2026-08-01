<template>
  <div class="ec" :class="`im-${impact}`">
    <div class="ec-head">
      <code class="ec-code">{{ code }}</code>
      <span class="ec-tags">
        <span class="ec-impact">{{ t(`err_impact_${impact}`) }}</span>
        <span class="ec-retry" :class="`rt-${retry}`">{{ t(`err_retry_${retry}`) }}</span>
        <span v-if="suspect" class="ec-suspect">
          <span translate="no" class="material-symbols-outlined">shield</span>
          <span>{{ t('err_suspect') }}</span>
        </span>
        <span v-if="http" class="ec-http">{{ http }}</span>
      </span>
    </div>
    <div class="ec-body">
      <p class="ec-when"><slot /></p>
      <p v-if="action" class="ec-action">
        <span translate="no" class="material-symbols-outlined">arrow_forward</span>
        <span>{{ action }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/* 오류 코드 하나를 한 블록으로 그린다.
   표로 두면 `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` 같은 긴 코드가 셀 폭에 걸려
   줄바꿈되면서 정작 제일 중요한 식별자가 가장 안 읽히는 상태가 된다.
   여기서는 코드가 제 줄을 통째로 갖고, 나머지는 그 옆 배지로 붙는다.

   영향(impact)과 의심(suspect)은 **독립된 두 축**이다. 조작된 키가 들어오는 것은
   거르면 끝이라 서비스 영향이 없지만, 계속 들어오면 해킹 시도다. 둘을 한 축에
   섞으면 "거르면 되는 것"과 "서비스가 멈추는 것"이 같은 색으로 보인다. */

import { useTranslate } from '../src/langs'

const { t } = useTranslate()

/* 라벨은 로케일 사전(`err_impact_*` / `err_retry_*` / `err_suspect`)에서 온다.
   컴포넌트에 문자열을 박아 두면 15개 언어 페이지가 전부 같은 언어의 배지를 단다. */
type Impact =
  /** 서비스나 특정 기능이 멈춘다. 발급 불가, 동기화 영구 실패, 초기화 실패. */
  | 'critical'
  /** 일부 요청·주기가 실패하지만 서비스는 계속 돈다. 대개 자가 회복한다. */
  | 'partial'
  /** 요청 하나를 거부하고 끝. 서비스에 영향이 없다. */
  | 'none'

type Retry = 'transient' | 'permanent' | 'state'

withDefaults(
  defineProps<{
    code: string
    /** 이 오류가 났을 때 서비스가 받는 타격. */
    impact: Impact
    retry: Retry
    /** 지속 발생 시 설정 이상이나 해킹 시도를 의심해야 하는 코드. */
    suspect?: boolean
    /** 해당하는 HTTP 상태가 있으면 표시한다. */
    http?: string
    /** 이 오류를 받은 쪽이 해야 할 일. */
    action?: string
  }>(),
  { suspect: false, http: '', action: '' },
)
</script>

<style scoped>
@reference 'tailwindcss';

/* 영향도는 왼쪽 띠 하나로만 낸다. 배경까지 물들이면 코드 자체보다 색이 먼저
   읽히고, 연달아 놓인 블록이 색 줄무늬처럼 보인다. */
.ec {
  @apply rounded-md mt-3 overflow-hidden;
  background-color: color-mix(in srgb, currentColor 4%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 8%, transparent);
  border-left: 3px solid var(--im);
}
.im-critical {
  --im: #dc2626;
  --im-soft: color-mix(in srgb, #dc2626 16%, transparent);
}
.im-partial {
  --im: #ea580c;
  --im-soft: color-mix(in srgb, #ea580c 16%, transparent);
}
.im-none {
  --im: color-mix(in srgb, currentColor 25%, transparent);
  --im-soft: color-mix(in srgb, currentColor 8%, transparent);
}

.ec-head {
  @apply flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-2.5;
}
/* 코드는 절대 줄바꿈되지 않는다. 좁은 화면에서는 이 줄만 가로로 스크롤된다. */
.ec-code {
  @apply font-bold text-[0.95em] whitespace-nowrap overflow-x-auto;
  color: var(--c-heading);
  background: none;
  padding: 0;
}
.ec-tags {
  @apply flex items-center gap-1.5 text-xs;
}
.ec-impact,
.ec-retry,
.ec-http,
.ec-suspect {
  @apply px-1.5 py-0.5 rounded font-medium whitespace-nowrap;
}
.ec-impact {
  background-color: var(--im-soft);
  color: var(--im);
}
.im-none .ec-impact {
  color: var(--c-muted);
}
.ec-retry {
  background-color: color-mix(in srgb, currentColor 8%, transparent);
  @apply opacity-70;
}
/* 일시적만 눈에 띄면 된다 — "기다리면 풀린다"가 유일하게 행동을 바꾸는 값이다. */
.rt-transient {
  background-color: color-mix(in srgb, var(--c-link-1) 16%, transparent);
  color: var(--c-link-1);
  @apply opacity-100;
}
/* 의심은 영향도와 다른 축이라 채움이 아니라 테두리로 낸다 — 나란히 놓여도
   "이건 다른 종류의 신호"로 읽힌다. */
.ec-suspect {
  @apply inline-flex items-center gap-0.5;
  border: 1px solid color-mix(in srgb, var(--c-accent-2) 55%, transparent);
  color: var(--c-accent-2);
  .material-symbols-outlined {
    @apply text-sm leading-4;
  }
}
.ec-http {
  background-color: color-mix(in srgb, var(--c-accent-1) 14%, transparent);
  color: var(--c-accent-1);
}

.ec-body {
  @apply px-3 pb-2.5 pt-1;
}
.ec-when {
  @apply text-sm m-0;
  color: var(--c-text-2);
}
.ec-action {
  @apply flex items-start gap-1 text-sm mt-1.5 mb-0;
  .material-symbols-outlined {
    @apply text-base leading-6 shrink-0;
    color: var(--im);
  }
}
.im-none .ec-action .material-symbols-outlined {
  color: var(--c-muted);
}
</style>
