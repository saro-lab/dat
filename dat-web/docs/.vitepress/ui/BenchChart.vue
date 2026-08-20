<!--
  언어별 성능 막대 차트. src/bench.ts의 실측 데이터를 초당 처리량 기준으로
  정렬해 가로 막대로 그리고, 막대에 마우스를 올리면 ops/s와 소요 시간을 함께
  띄운다.

  데이터가 비어 있으면(= 아직 실측하지 않았으면) 컴포넌트 전체가 렌더되지
  않는다. 문서에 미리 심어 두어도 빈 상자가 남지 않게 하려는 의도이며, 절대
  자리 채우기용 가짜 수치를 넣지 않는다는 bench.ts의 규칙과 짝을 이룬다.
-->
<template>
  <div v-if="rows.length" class="bench my-4">
    <div v-if="title" class="bench-title">{{ title }}</div>
    <div v-if="desc" class="bench-desc">{{ desc }}</div>
    <div class="bench-rows g-ltr">
      <div v-for="(row, i) in rows" :key="row.target" class="bench-row">
        <component
          :is="row.link ? 'a' : 'span'"
          :href="row.link ? `${root}${row.link}` : undefined"
          class="bench-name"
        >
          {{ row.target }}
        </component>
        <div class="bench-track">
          <div class="bench-bar" :style="{ width: `${row.pct}%`, animationDelay: `${i * 45}ms` }"></div>
          <div class="bench-tip">{{ row.opsLabel }} {{ unit }} · {{ row.msLabel }}</div>
        </div>
        <div class="bench-ops">{{ row.opsLabel }}</div>
      </div>
    </div>
    <div v-if="note" class="bench-note">{{ note }}</div>
    <div v-if="envLine" class="bench-note">{{ envLine }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BENCH_ENV, BENCH_WORKLOAD, getAllBenches } from '../src/bench'
import { useRoot } from '../src/langs'

const props = defineProps<{
  title?: string
  desc?: string
  note?: string
  unit?: string
}>()

const root = useRoot()
const unit = computed(() => props.unit ?? 'ops/s')

const rows = computed(() => {
  const benches = getAllBenches()
  if (!benches.length) {
    return []
  }
  const fastest = Math.max(...benches.map((entry) => entry.opsPerSec))
  return benches.map((entry) => ({
    target: entry.target,
    link: entry.link,
    pct: fastest > 0 ? (entry.opsPerSec / fastest) * 100 : 0,
    opsLabel: Math.round(entry.opsPerSec).toLocaleString('en-US'),
    msLabel: `${entry.ms.toLocaleString('en-US', { maximumFractionDigits: 1 })} ms`,
  }))
})

const envLine = computed(() => [BENCH_WORKLOAD, BENCH_ENV].filter(Boolean).join(' · '))
</script>

<style scoped>
@reference 'tailwindcss';

.bench {
    --tip-fg: var(--c-bg);
    @apply rounded-lg p-3.5;
    background: color-mix(in srgb, currentColor 5%, transparent);
}

.bench-title {
    @apply text-[0.7rem] font-semibold uppercase tracking-[0.08em] mb-1.5;
    color: var(--c-muted);
}
.bench-desc {
    @apply text-xs leading-relaxed mb-2.5;
    color: var(--c-text-2);
}

.bench-row {
    @apply relative flex items-center gap-2 py-[3px] rounded-sm;

    &:hover {
        background: color-mix(in srgb, currentColor 5%, transparent);

        .bench-tip {
            @apply opacity-100 translate-y-0;
        }
    }
}
.bench-name {
    @apply text-xs font-semibold truncate shrink-0 inline-flex items-center;
    width: 6.5rem;
    color: var(--c-text-1);
}
a.bench-name:hover {
    color: var(--c-link-1);
}

.bench-track {
    @apply relative flex items-center flex-1 min-w-0;
    border-left: 1px solid color-mix(in srgb, currentColor 22%, transparent);
}
.bench-bar {
    @apply h-3 shrink-0;
    min-width: 3px;
    border-radius: 0 4px 4px 0;
    background: var(--c-chart-1);
    animation: bench-grow 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) backwards;
}
@keyframes bench-grow {
    from { width: 0; }
}
@media (prefers-reduced-motion: reduce) {
    .bench-bar {
        animation: none;
    }
}

.bench-ops {
    @apply text-[11px] text-right whitespace-nowrap shrink-0;
    width: 5.5rem;
    font-variant-numeric: tabular-nums;
    color: var(--c-text-2);
}

.bench-tip {
    @apply absolute left-0 z-10 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap
        opacity-0 translate-y-0.5 pointer-events-none transition-all duration-150;
    bottom: calc(100% + 4px);
    background: var(--c-text-1);
    color: var(--tip-fg);
    text-shadow: none;
    font-variant-numeric: tabular-nums;
}

.bench-note {
    @apply text-[11px] mt-2 leading-relaxed;
    color: color-mix(in srgb, var(--c-text-1) 55%, transparent);

    & + & {
        @apply mt-0.5;
    }
}
</style>
