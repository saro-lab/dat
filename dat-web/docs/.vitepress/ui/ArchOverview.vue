<!--
  DAT 전체 구조도. 아래쪽 한 줄에 그룹(클라이언트 · 서비스 등)을 좌우로 늘어놓고,
  위쪽의 DAT CMS가 인증서를 받는 그룹들 위로 레일을 뻗어 내려꽂는 형태를 그린다.
  "토큰은 앱 사이를 흐르고, 인증서는 CMS에서 내려온다"는 두 갈래 흐름을 한 장으로
  보여주는 것이 목적이다.

  한 그룹 안의 상자는 각자 kind/icon/note를 가질 수 있다 — 하나의 서비스 안에서
  로그인 서버는 발급 권한, 나머지는 검증 권한처럼 역할이 갈리는 그림을 그리기 위함.

  가로 한 줄은 CSS Grid의 같은 열을 공유하므로 CMS 레일과 아래 그룹이 항상
  같은 x축에 정렬된다. 라벨은 전부 props로 받아 14개 언어가 각자 문자열을
  넘긴다 — 로케일 사전에 키를 추가하지 않는다.
-->
<template>
  <div class="arch-scroll my-4">
    <div class="arch" :style="{ gridTemplateColumns: `repeat(${colCount}, auto)` }">
      <template v-if="cms && certCols.length">
        <div class="arch-cms" :style="{ gridRow: '1', gridColumn: railSpan }">
          <div class="arch-box cms">
            <span translate="no" class="material-symbols-outlined">{{ cms.icon || 'workspace_premium' }}</span>
            {{ cms.label }}
          </div>
          <div v-if="cms.note" class="arch-note">{{ cms.note }}</div>
        </div>

        <div class="arch-rail-h" :style="{ gridRow: '2', gridColumn: railSpan }">
          <span v-if="cms.linkLabel" class="arch-rail-label">{{ cms.linkLabel }}</span>
        </div>

        <div
          v-for="col in certCols"
          :key="`v-${col}`"
          class="arch-rail-v"
          :style="{ gridRow: '3', gridColumn: `${col}` }"
        ></div>
      </template>

      <template v-for="(group, gi) in groups" :key="`g-${gi}`">
        <div class="arch-col" :class="{ cert: group.cert }" :style="{ gridRow: '4', gridColumn: `${gi * 2 + 1}` }">
          <div class="arch-group" :class="group.kind || 'plain'">
            <div v-if="group.title" class="arch-group-title">{{ group.title }}</div>
            <div v-for="(item, ii) in boxes(group)" :key="ii" class="arch-box" :class="item.kind">
              <span v-if="item.icon" translate="no" class="material-symbols-outlined">{{ item.icon }}</span>
              {{ item.label }}
              <span v-if="item.note" class="arch-tag">{{ item.note }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="links[gi] && gi < groups.length - 1"
          class="arch-link"
          :style="{ gridRow: '4', gridColumn: `${gi * 2 + 2}` }"
        >
          <div v-if="links[gi].label" class="arch-link-label">{{ links[gi].label }}</div>
          <div class="arch-link-line" :class="links[gi].dir || 'right'"></div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type ArchKind = 'client' | 'issuer' | 'verifier' | 'service' | 'plain'

/** A plain string takes the group's `kind`/`icon`; an object overrides them per box. */
export type ArchItem =
  | string
  | {
      label: string
      kind?: ArchKind
      /** Material Symbols name for this box only. */
      icon?: string
      /** Small badge inside the box, e.g. the box's DAT permission. */
      note?: string
    }

export type ArchGroup = {
  /** Dashed-box caption, e.g. `Service`. Omit for a bare column such as the client. */
  title?: string
  /** One rounded box per entry. */
  items: ArchItem[]
  kind?: ArchKind
  /** Material Symbols name used by every box that doesn't set its own. */
  icon?: string
  /** Draws a certificate-distribution rail from the CMS down onto this group. */
  cert?: boolean
}

export type ArchLink = {
  label?: string
  dir?: 'right' | 'left' | 'both'
}

export type ArchCms = {
  label: string
  /** Small caption under the CMS box. */
  note?: string
  /** Label printed above the distribution rail, e.g. `certificate sync`. */
  linkLabel?: string
  icon?: string
}

const props = defineProps<{
  groups: ArchGroup[]
  /** `links[i]` sits between `groups[i]` and `groups[i + 1]`. */
  links?: ArchLink[]
  cms?: ArchCms
}>()

const links = computed(() => props.links ?? [])

/** Fills each box in with the group's defaults so the template reads one shape. */
function boxes(group: ArchGroup) {
  return group.items.map((item) => {
    const box = typeof item === 'string' ? {label: item} : item
    return {
      label: box.label,
      kind: box.kind || group.kind || 'plain',
      icon: box.icon || group.icon,
      note: box.note,
    }
  })
}

/** Groups and the gaps between them interleave, so `n` groups need `2n - 1` columns. */
const colCount = computed(() => Math.max(props.groups.length * 2 - 1, 1))

/** 1-based grid column of each group that receives certificates from the CMS. */
const certCols = computed(() =>
  props.groups.flatMap((g, i) => (g.cert ? [i * 2 + 1] : [])),
)

/** The rail spans from the first cert group to the last, inclusive. */
const railSpan = computed(() => {
  const cols = certCols.value
  if (!cols.length) {
    return '1'
  }
  return `${cols[0]} / ${cols[cols.length - 1] + 1}`
})
</script>

<style scoped>
@reference 'tailwindcss';

.arch-scroll {
    @apply overflow-x-auto rounded-lg;
    background: color-mix(in srgb, currentColor 5%, transparent);
}
/* 내용 폭으로 잡되 컨테이너보다 좁으면 100%로 늘려 가운데 정렬을 유지한다.
   overflow 중인 flex/grid를 center로 두면 양쪽으로 삐져나가 시작 쪽이 스크롤로
   닿지 않는 자리에 갇힌다 — min-width로 그 상황을 원천 차단한다. */
.arch {
    @apply grid justify-center items-end px-4 py-5;
    width: max-content;
    min-width: 100%;
}

.arch-cms {
    @apply flex flex-col items-center pb-1.5;
}
.arch-note {
    @apply text-center mt-1;
    font-size: 11px;
    color: var(--c-text-2);
}

.arch-rail-h {
    @apply relative mx-auto w-full;
    height: 1.1rem;
    border-bottom: 1.5px dashed color-mix(in srgb, var(--c-accent-2) 60%, transparent);
}
.arch-rail-label {
    @apply absolute left-0 right-0 text-center whitespace-nowrap;
    bottom: 2px;
    font-size: 11px;
    color: var(--c-text-2);
}

/* 레일에서 그룹으로 내려꽂히는 수직 스텁 — 끝에 삼각형 화살촉을 붙인다. */
.arch-rail-v {
    @apply relative mx-auto;
    width: 1.5px;
    height: 1.35rem;
    background: color-mix(in srgb, var(--c-accent-2) 60%, transparent);

    &::after {
        content: '';
        @apply absolute left-1/2 -translate-x-1/2;
        bottom: -1px;
        border-left: 4.75px solid transparent;
        border-right: 4.75px solid transparent;
        border-top: 8px solid color-mix(in srgb, var(--c-accent-2) 60%, transparent);
    }
}

/* 인증서를 받는 열은 위로 붙여 레일 화살촉이 상자 윗면에 정확히 닿게 하고,
   나머지 열(클라이언트 등)은 세로 가운데로 맞춰 옆의 화살표와 눈높이를 맞춘다. */
.arch-col {
    @apply flex flex-col justify-center shrink-0 self-center;

    &.cert {
        @apply self-start;
    }
}

/* 라벨은 줄바꿈하지 않으므로 열 너비를 라벨에 맞춰 늘린다 — 고정 폭으로 두면
   14개 언어 중 긴 문장이 양옆 상자 위로 삐져나간다. */
.arch-link {
    @apply relative flex flex-col justify-end shrink-0 self-center px-2;
    min-width: 7rem;
    padding-bottom: 2px;
}
.arch-link-label {
    @apply text-center whitespace-nowrap mb-1;
    font-size: 11px;
    color: var(--c-text-2);
}
.arch-link-line {
    @apply relative mx-1;
    border-top: 1.5px solid color-mix(in srgb, var(--c-text-1) 45%, transparent);

    &::before,
    &::after {
        content: '';
        @apply absolute;
        top: -5.5px;
        border-top: 4.75px solid transparent;
        border-bottom: 4.75px solid transparent;
    }
    &.right::after,
    &.both::after {
        right: -1px;
        border-left: 8px solid color-mix(in srgb, var(--c-text-1) 45%, transparent);
    }
    &.left::before,
    &.both::before {
        left: -1px;
        border-right: 8px solid color-mix(in srgb, var(--c-text-1) 45%, transparent);
    }
}

.arch-group {
    @apply flex flex-col gap-1.5 rounded-xl p-2.5 pt-2;
    border: 1.5px dashed color-mix(in srgb, currentColor 25%, transparent);

    /* 제목 없는 단독 열(클라이언트 등)은 점선 상자로 묶을 게 없다 */
    &.plain,
    &.client {
        @apply border-transparent p-1;
    }
    &.issuer {
        border-color: color-mix(in srgb, var(--c-accent-1) 55%, transparent);
        background: color-mix(in srgb, var(--c-accent-1) 5%, transparent);
    }
    &.verifier {
        border-color: color-mix(in srgb, var(--c-link-1) 55%, transparent);
        background: color-mix(in srgb, var(--c-link-1) 5%, transparent);
    }
    /* 역할이 섞인 상자를 담는 중립 테두리 — 안쪽 상자 색이 주인공이다. */
    &.service {
        @apply gap-2 p-3 pt-2;
        border-color: color-mix(in srgb, currentColor 32%, transparent);
        background: color-mix(in srgb, currentColor 4%, transparent);
    }
}
.arch-group-title {
    @apply text-center font-bold mb-0.5;
    font-size: 11px;
    color: var(--c-text-2);

    .arch-group.issuer & {
        color: var(--c-accent-1);
    }
    .arch-group.verifier & {
        color: var(--c-link-1);
    }
    .arch-group.service & {
        @apply text-xs;
        color: var(--c-text-1);
    }
}

/* 상자 안 권한 배지 — 같은 그룹 안에서 발급/검증을 구분해 읽게 한다. */
.arch-tag {
    @apply rounded px-1.5 py-0.5 font-bold;
    font-size: 10px;

    .arch-box.issuer & {
        color: var(--c-accent-1);
        background: color-mix(in srgb, var(--c-accent-1) 18%, transparent);
    }
    .arch-box.verifier & {
        color: var(--c-link-1);
        background: color-mix(in srgb, var(--c-link-1) 18%, transparent);
    }
    .arch-box.plain &,
    .arch-box.client & {
        color: var(--c-text-2);
        background: color-mix(in srgb, currentColor 12%, transparent);
    }
}

.arch-box {
    @apply flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap;
    color: var(--c-text-1);

    .material-symbols-outlined {
        @apply text-base! leading-none;
    }

    &.plain,
    &.client {
        background: color-mix(in srgb, currentColor 8%, transparent);
        border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
    }
    &.issuer {
        background: color-mix(in srgb, var(--c-accent-1) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--c-accent-1) 45%, transparent);

        .material-symbols-outlined {
            color: var(--c-accent-1);
        }
    }
    &.verifier {
        background: color-mix(in srgb, var(--c-link-1) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--c-link-1) 45%, transparent);

        .material-symbols-outlined {
            color: var(--c-link-1);
        }
    }
    &.cms {
        background: color-mix(in srgb, var(--c-accent-2) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--c-accent-2) 50%, transparent);

        .material-symbols-outlined {
            color: var(--c-accent-2);
        }
    }
}
</style>
