<!--
  인증서 수명주기 타임라인. 생성 → 발급 지연(delay) → 발급 가능 구간(duration)
  → 발급은 끝났지만 이미 나간 DAT를 검증해 주는 잔여 구간(TTL) → 최종 만료를
  구간 막대로 이어 그린다. "인증서는 delay + duration + ttl 이 모두 지난 뒤에야
  만료된다"는 규칙을 한 장으로 보여 주는 것이 이 그림의 존재 이유다.

  구간 폭은 phases[].weight의 비율이고, 경계 눈금(marks)은 구간 사이 경계에
  차례로 붙는다 — 구간이 n개면 경계는 n+1개다. 라벨은 전부 props로 받는다.
-->
<template>
  <div class="ct my-4">
    <div v-if="title" class="ct-title">{{ title }}</div>
    <div class="ct-scroll g-ltr">
      <div class="ct-canvas">
        <div class="ct-marks">
          <div
            v-for="(mark, i) in marks"
            :key="`m-${i}`"
            class="ct-mark"
            :class="markAlign(i)"
            :style="{ left: `${bounds[i] ?? 0}%` }"
          >
            <span class="ct-mark-label">{{ mark }}</span>
            <span class="ct-mark-tick"></span>
          </div>
        </div>

        <div class="ct-bars">
          <div
            v-for="(p, i) in phases"
            :key="`p-${i}`"
            class="ct-bar"
            :class="p.kind || 'plain'"
            :style="{ flexGrow: p.weight }"
          >
            <span class="ct-bar-label">{{ p.label }}</span>
          </div>
        </div>

        <div class="ct-notes">
          <div
            v-for="(p, i) in phases"
            :key="`n-${i}`"
            class="ct-note"
            :class="p.kind || 'plain'"
            :style="{ flexGrow: p.weight }"
          >
            <span v-if="p.note">{{ p.note }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="caption" class="ct-caption">{{ caption }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type CertPhase = {
  label: string
  weight: number
  kind?: 'delay' | 'issue' | 'ttl' | 'expired' | 'plain'
  note?: string
}

const props = defineProps<{
  phases: CertPhase[]
  marks?: string[]
  title?: string
  caption?: string
}>()

const marks = computed(() => props.marks ?? [])

const bounds = computed(() => {
  const total = props.phases.reduce((sum, p) => sum + (p.weight || 0), 0) || 1
  const out = [0]
  let acc = 0
  for (const p of props.phases) {
    acc += p.weight || 0
    out.push((acc / total) * 100)
  }
  return out
})

function markAlign(i: number): string {
  if (i === 0) {
    return 'start'
  }
  return i === marks.value.length - 1 && i === props.phases.length ? 'end' : 'mid'
}
</script>

<style scoped>
@reference 'tailwindcss';

.ct-title {
    @apply text-[0.7rem] font-semibold uppercase tracking-[0.08em] mb-2;
    color: var(--c-muted);
}

.ct-scroll {
    @apply overflow-x-auto rounded-lg;
    background: color-mix(in srgb, currentColor 5%, transparent);
}
.ct-canvas {
    @apply px-4 pt-2 pb-3;
    min-width: 34rem;
}

.ct-marks {
    @apply relative;
    height: 2.1rem;
}
.ct-mark {
    @apply absolute bottom-0 flex flex-col items-center;

    &.start { @apply items-start translate-x-0; }
    &.mid { @apply -translate-x-1/2; }
    &.end { @apply items-end -translate-x-full; }
}
.ct-mark-label {
    @apply whitespace-nowrap px-1;
    font-size: 11px;
    font-weight: 600;
    color: var(--c-text-2);
}
.ct-mark-tick {
    @apply block w-px;
    height: 0.45rem;
    background: color-mix(in srgb, var(--c-text-1) 40%, transparent);

    .ct-mark.start & { @apply ml-1; }
    .ct-mark.end & { @apply mr-1; }
}

.ct-bars {
    @apply flex items-stretch gap-0.5;
}
.ct-bar {
    @apply relative flex items-center justify-center rounded-md px-2 basis-0 min-w-0;
    --ct-color: var(--c-muted);
    height: 2.1rem;
    background: color-mix(in srgb, var(--ct-color) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--ct-color) 40%, transparent);

    &.delay { --ct-color: var(--c-muted); }
    &.issue { --ct-color: var(--c-accent-1); }
    &.ttl { --ct-color: var(--c-link-1); }
    &.expired {
        --ct-color: var(--c-text-1);
        background: repeating-linear-gradient(
            -45deg,
            color-mix(in srgb, var(--ct-color) 10%, transparent) 0 5px,
            transparent 5px 10px
        );
    }
}
.ct-bar-label {
    @apply text-center truncate;
    font-size: 11px;
    font-weight: 700;
    color: var(--c-text-1);
}

.ct-notes {
    @apply flex items-start gap-0.5 mt-1;
}
.ct-note {
    @apply text-center px-1 basis-0 min-w-0 leading-snug;
    font-size: 10px;
    color: color-mix(in srgb, var(--c-text-1) 60%, transparent);
}

.ct-caption {
    @apply mt-2 leading-relaxed;
    font-size: 11px;
    color: color-mix(in srgb, var(--c-text-1) 65%, transparent);
}
</style>
