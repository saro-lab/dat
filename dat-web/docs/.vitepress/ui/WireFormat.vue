<!--
  DAT 와이어 포맷 도해. `expire . cid . plain . secure . signature` 다섯 구간을
  점(.) 구분자와 함께 색 띠로 늘어놓고, 각 구간 아래에 타입·인코딩을 적는다.
  구간에 마우스를 올리면 아래 캡션 줄이 그 구간의 설명으로 바뀐다 — 캡션 줄은
  항상 자리를 차지하므로 호버해도 레이아웃이 흔들리지 않는다.

  Struct.vue는 실제 값을 뽑아 보여 주는 생성기이고, 이쪽은 값 없이 형식만
  설명하는 정적 도해다. 라벨은 전부 props로 받는다.
-->
<template>
  <div class="wf my-4">
    <div v-if="title" class="wf-title">{{ title }}</div>
    <div class="wf-scroll">
      <div class="wf-track">
        <template v-for="(seg, i) in segments" :key="i">
          <span v-if="i > 0" class="wf-dot">.</span>
          <div
            class="wf-seg"
            :class="[seg.kind || 'meta', { on: sel === i }]"
            :style="{ flexGrow: seg.width ?? 1 }"
            @mouseover="sel = i"
            @mouseout="sel = -1"
            @focus="sel = i"
            @blur="sel = -1"
            tabindex="0"
          >
            <div class="wf-name">{{ seg.name }}</div>
            <div class="wf-type">{{ seg.type }}</div>
          </div>
        </template>
      </div>
    </div>
    <div v-if="hasNotes" class="wf-caption">{{ caption }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

export type WireSegment = {
  /** Field name printed inside the band, e.g. `expire`. */
  name: string
  /** Type and encoding printed under the name, e.g. `uint64 (dec)`. */
  type: string
  /** Shown in the caption line while the band is hovered or focused. */
  note?: string
  kind?: 'meta' | 'plain' | 'secure' | 'sig'
  /** Relative band width; defaults to 1 so every field is equally wide. */
  width?: number
}

const props = defineProps<{
  segments: WireSegment[]
  title?: string
  /** Caption shown while nothing is hovered, e.g. `hover a field for details`. */
  hint?: string
}>()

const sel = ref(-1)

const hasNotes = computed(() => props.segments.some((s) => s.note))

const caption = computed(() => {
  const note = sel.value >= 0 ? props.segments[sel.value]?.note : ''
  return note || props.hint || ''
})
</script>

<style scoped>
@reference 'tailwindcss';

.wf-title {
    @apply text-sm font-bold mb-2;
    color: var(--c-text-1);
}

.wf-scroll {
    @apply overflow-x-auto rounded-lg p-3;
    background: color-mix(in srgb, currentColor 5%, transparent);
}
.wf-track {
    @apply flex items-stretch gap-1;
    min-width: 30rem;
}

.wf-dot {
    @apply self-center font-bold shrink-0;
    color: color-mix(in srgb, var(--c-text-1) 45%, transparent);
}

/* 띠 색은 필드의 성격을 나눈다: 메타(만료·CID)는 중립, plain은 액센트,
   secure는 암호화 구간이라 예비색(chart-3), 서명은 링크색으로 잠금 느낌. */
.wf-seg {
    --wf-color: var(--c-muted);
    @apply flex flex-col items-center justify-center rounded-md px-2 py-2 text-center cursor-default
        basis-0 min-w-0 transition-colors duration-150;
    background: color-mix(in srgb, var(--wf-color) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--wf-color) 38%, transparent);

    &.plain { --wf-color: var(--c-accent-1); }
    &.secure { --wf-color: var(--c-chart-3); }
    &.sig { --wf-color: var(--c-link-1); }

    &:hover,
    &.on,
    &:focus-visible {
        background: color-mix(in srgb, var(--wf-color) 26%, transparent);
        border-color: color-mix(in srgb, var(--wf-color) 70%, transparent);
    }
    &:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--wf-color) 70%, transparent);
        outline-offset: 1px;
    }
}
@media (prefers-reduced-motion: reduce) {
    .wf-seg {
        @apply transition-none;
    }
}

.wf-name {
    @apply text-xs font-bold break-all;
    color: var(--c-text-1);
}
.wf-type {
    @apply mt-0.5 whitespace-nowrap;
    font-size: 10px;
    color: var(--c-text-2);
}

.wf-caption {
    @apply mt-2 min-h-5 leading-relaxed;
    font-size: 11px;
    color: color-mix(in srgb, var(--c-text-1) 65%, transparent);
}
</style>
