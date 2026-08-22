<!--
  시퀀스 다이어그램. 세로 생명선(actor) 위에 시간 순서대로 화살표(step)를 쌓아
  "누가 누구에게 무엇을 보내는가"를 그린다. CMS 인증서 동기화, DAT 발급→검증
  흐름처럼 순서가 핵심인 설명에 쓴다.

  라벨은 전부 props로 받는다 — 14개 언어의 각 md가 자기 언어 문자열을 그대로
  넘기는 구조라, 로케일 사전에 키를 추가하지 않고 번역을 확장할 수 있다.
-->
<template>
  <div class="fd my-4">
    <div v-if="title" class="fd-title">{{ title }}</div>
    <div class="fd-scroll g-ltr g-xscroll">
      <div class="fd-canvas" :style="{ minWidth: `${actors.length * 9}rem` }">
        <div class="fd-actors">
          <div
            v-for="a in actors"
            :key="a.id"
            class="fd-actor"
            :class="a.kind || 'node'"
            :style="{ left: pct(a.id) }"
          >
            {{ a.label }}
          </div>
        </div>
        <div class="fd-body">
          <div v-for="a in actors" :key="`l-${a.id}`" class="fd-line" :style="{ left: pct(a.id) }"></div>
          <div v-for="(s, i) in steps" :key="i" class="fd-step">
            <div v-if="isNote(s)" class="fd-note" :style="{ left: pct(s.from) }">{{ s.label }}</div>
            <div v-else class="fd-arrow" :class="[s.kind || 'req', dir(s)]" :style="arrowStyle(s)">
              <span class="fd-label">{{ s.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="props.showLegend" class="fd-legend">
      <span v-if="hasKind('req')" class="fd-key"><i class="fd-sample req"></i>{{ legend?.req ?? 'request' }}</span>
      <span v-if="hasKind('res')" class="fd-key"><i class="fd-sample res"></i>{{ legend?.res ?? 'response' }}</span>
      <span v-if="hasKind('sync')" class="fd-key"><i class="fd-sample sync"></i>{{ legend?.sync ?? 'certificate sync' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type FlowActor = {
  id: string
  label: string
  kind?: 'client' | 'node' | 'issuer' | 'cms'
}

export type FlowStep = {
  from: string
  to?: string
  label: string
  kind?: 'req' | 'res' | 'sync' | 'note'
}

const props = withDefaults(
  defineProps<{
    actors: FlowActor[]
    steps: FlowStep[]
    title?: string
    legend?: { req?: string; res?: string; sync?: string }
    showLegend?: boolean
  }>(),
  { showLegend: true, title: '', legend: undefined },
)

const xs = computed(() => {
  const map = new Map<string, number>()
  props.actors.forEach((a, i) => map.set(a.id, ((i + 0.5) / props.actors.length) * 100))
  return map
})

function pct(id: string): string {
  return `${xs.value.get(id) ?? 50}%`
}

function isNote(s: FlowStep): boolean {
  return s.kind === 'note' || !s.to || s.to === s.from
}

function dir(s: FlowStep): string {
  const from = xs.value.get(s.from) ?? 0
  const to = xs.value.get(s.to || s.from) ?? 0
  return to >= from ? 'dir-r' : 'dir-l'
}

function arrowStyle(s: FlowStep): Record<string, string> {
  const from = xs.value.get(s.from) ?? 0
  const to = xs.value.get(s.to || s.from) ?? 0
  return {
    left: `${Math.min(from, to)}%`,
    width: `${Math.abs(to - from)}%`,
  }
}

function hasKind(kind: string): boolean {
  return props.steps.some((s) => !isNote(s) && (s.kind || 'req') === kind)
}
</script>

<style scoped>
@reference 'tailwindcss';

.fd {
    --fd-sync: var(--c-accent-1);
    --fd-cms: var(--c-accent-2);
}

.fd-title {
    @apply text-[0.7rem] font-semibold uppercase tracking-[0.08em] mb-2;
    color: var(--c-muted);
}

.fd-scroll {
    @apply overflow-x-auto rounded-lg;
    background: color-mix(in srgb, currentColor 5%, transparent);
}
.fd-canvas {
    @apply relative px-4 pt-3 pb-4;
}

.fd-actors {
    @apply relative h-8;
}
.fd-actor {
    @apply absolute top-0 -translate-x-1/2 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap;
    color: var(--c-text-1);
    background: color-mix(in srgb, currentColor 8%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);

    &.client {
        background: color-mix(in srgb, var(--c-link-1) 12%, transparent);
        border-color: color-mix(in srgb, var(--c-link-1) 38%, transparent);
    }
    &.issuer {
        background: color-mix(in srgb, var(--fd-sync) 14%, transparent);
        border-color: color-mix(in srgb, var(--fd-sync) 45%, transparent);
    }
    &.cms {
        background: color-mix(in srgb, var(--fd-cms) 14%, transparent);
        border-color: color-mix(in srgb, var(--fd-cms) 45%, transparent);
    }
}

.fd-body {
    @apply relative pt-1;
}
.fd-line {
    @apply absolute top-0 bottom-0 w-px;
    background: color-mix(in srgb, currentColor 16%, transparent);
}

.fd-step {
    @apply relative;
    height: 2.3rem;
}

.fd-arrow {
    --fd-color: var(--c-link-1);
    @apply absolute;
    bottom: 0.45rem;
    border-bottom: 1.5px solid var(--fd-color);

    &.res {
        --fd-color: color-mix(in srgb, var(--c-text-1) 60%, transparent);
        border-bottom-style: dashed;
    }
    &.sync {
        --fd-color: var(--fd-sync);
    }

    &::after {
        content: '';
        @apply absolute;
        bottom: -4.75px;
        border-top: 4px solid transparent;
        border-bottom: 4px solid transparent;
    }
    &.dir-r::after {
        right: -1px;
        border-left: 7px solid var(--fd-color);
    }
    &.dir-l::after {
        left: -1px;
        border-right: 7px solid var(--fd-color);
    }
}
.fd-label {
    @apply absolute left-0 right-0 text-center whitespace-nowrap;
    bottom: 3px;
    font-size: 11px;
    color: var(--c-text-2);
}

.fd-note {
    @apply absolute -translate-x-1/2 px-2 py-0.5 rounded whitespace-nowrap;
    bottom: 0.3rem;
    font-size: 11px;
    color: var(--c-text-2);
    background: color-mix(in srgb, currentColor 9%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
}

.fd-legend {
    @apply flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5;
}
.fd-key {
    @apply inline-flex items-center gap-1.5;
    font-size: 11px;
    color: var(--c-text-2);
}
.fd-sample {
    @apply inline-block w-5;

    &.req { border-bottom: 1.5px solid var(--c-link-1); }
    &.res { border-bottom: 1.5px dashed color-mix(in srgb, var(--c-text-1) 60%, transparent); }
    &.sync { border-bottom: 1.5px solid var(--fd-sync); }
}
</style>
