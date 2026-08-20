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
        <span translate="no" class="material-symbols-outlined g-flip-rtl">arrow_forward</span>
        <span>{{ action }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">

import { useTranslate } from '../src/langs'

const { t } = useTranslate()

type Impact =
  | 'critical'
  | 'partial'
  | 'none'

type Retry = 'transient' | 'permanent' | 'state'

withDefaults(
  defineProps<{
    code: string
    impact: Impact
    retry: Retry
    suspect?: boolean
    http?: string
    action?: string
  }>(),
  { suspect: false, http: '', action: '' },
)
</script>

<style scoped>
@reference 'tailwindcss';

.ec {
  @apply rounded-md mt-3 overflow-hidden;
  background-color: color-mix(in srgb, currentColor 4%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 8%, transparent);
  border-inline-start: 3px solid var(--im);
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
.ec-code {
  @apply font-semibold text-[0.92em] whitespace-nowrap overflow-x-auto;
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
.rt-transient {
  background-color: color-mix(in srgb, var(--c-link-1) 16%, transparent);
  color: var(--c-link-1);
  @apply opacity-100;
}
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
