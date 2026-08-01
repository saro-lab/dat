<!--
  DAT 전체 구조도. 유저 ↔ 서비스 ↔ DAT CMS 를 좌우 한 줄로 놓고, 서비스 안의
  서버(로그인 · 콘텐츠)마다 한 행을 차지하게 해서 화살표가 "어느 서버와 주고받는
  대화인지"를 행 단위로 보여준다.

  같은 CSS Grid 행을 공유하므로 화살표와 상자가 항상 같은 높이에 놓인다. 서비스
  점선 테두리는 3열 전체를 덮는 배경 격자 항목이고, 상자·제목이 그 위에 겹쳐진다.
  라벨은 전부 props로 받는다 — 로케일 사전에 키를 추가하지 않는다.
-->
<template>
  <div class="flow-scroll my-4">
    <div class="flow" :style="{ gridTemplateRows: rowTemplate }">
      <div class="flow-frame" :style="{ gridColumn: '3', gridRow: rowSpan }"></div>
      <div v-if="service.title" class="flow-title" :style="{ gridColumn: '3', gridRow: '1' }">
        {{ service.title }}
      </div>

      <div class="flow-side" :style="{ gridColumn: '1', gridRow: rowSpan }">
        <div class="flow-box tall user">
          <div class="flow-box-title">
            <span v-if="user.icon" translate="no" class="material-symbols-outlined">{{ user.icon }}</span>
            {{ user.label }}
          </div>
          <div v-if="user.note" class="flow-box-note">
            <div v-for="(line, i) in noteLines(user)" :key="i">{{ line }}</div>
          </div>
        </div>
      </div>

      <div class="flow-side" :style="{ gridColumn: '5', gridRow: rowSpan }">
        <div class="flow-box tall cms">
          <div class="flow-box-title">
            <span translate="no" class="material-symbols-outlined">{{ cms.icon || 'workspace_premium' }}</span>
            {{ cms.label }}
          </div>
          <div v-if="cms.note" class="flow-box-note">
            <div v-for="(line, i) in noteLines(cms)" :key="i">{{ line }}</div>
          </div>
        </div>
      </div>

      <template v-for="(server, i) in servers" :key="i">
        <div class="flow-link" :style="{ gridColumn: '2', gridRow: `${i + firstRow}` }">
          <div v-if="server.request" class="flow-arrow">
            <div class="flow-label" :class="server.kind">{{ server.request }}</div>
            <div class="flow-line right" :class="server.kind"></div>
          </div>
          <div v-if="server.response" class="flow-arrow">
            <div class="flow-label" :class="server.kind">{{ server.response }}</div>
            <div class="flow-line left" :class="server.kind"></div>
          </div>
        </div>

        <div class="flow-cell" :style="{ gridColumn: '3', gridRow: `${i + firstRow}` }">
          <div class="flow-box" :class="server.kind">
            <span v-if="server.icon" translate="no" class="material-symbols-outlined">{{ server.icon }}</span>
            {{ server.label }}
          </div>
        </div>

        <div class="flow-link" :style="{ gridColumn: '4', gridRow: `${i + firstRow}` }">
          <div v-if="server.sync" class="flow-arrow">
            <div class="flow-label" :class="server.kind">{{ server.sync }}</div>
            <div class="flow-line left sync" :class="server.kind"></div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type FlowNode = {
  label: string
  /** Material Symbols name. */
  icon?: string
  /** Small caption inside the box. An array prints one line per entry. */
  note?: string | string[]
}

export type FlowServer = {
  label: string
  icon?: string
  kind?: 'issuer' | 'verifier'
  /** Label on the user → server arrow. */
  request?: string
  /** Label on the server → user arrow. */
  response?: string
  /** Label on the CMS → server arrow. */
  sync?: string
}

const props = defineProps<{
  user: FlowNode
  service: { title?: string; servers: FlowServer[] }
  cms: FlowNode
}>()

const servers = computed(() => props.service.servers)

function noteLines(node: FlowNode): string[] {
  return Array.isArray(node.note) ? node.note : node.note ? [node.note] : []
}

/**
 * The title, when there is one, takes row 1 and pushes the servers down. Without
 * it the servers start at row 1 — an empty title row would still eat a row gap
 * and push the arrows off the vertical centre of the boxes beside them.
 */
const firstRow = computed(() => (props.service.title ? 2 : 1))

const rowTemplate = computed(() =>
  props.service.title
    ? `auto repeat(${servers.value.length}, auto)`
    : `repeat(${servers.value.length}, auto)`,
)

/** The user/CMS boxes and the service frame span every row of the diagram. */
const rowSpan = computed(() => `1 / ${servers.value.length + firstRow.value}`)
</script>

<style scoped>
@reference 'tailwindcss';

.flow-scroll {
    @apply overflow-x-auto rounded-lg;
    background: color-mix(in srgb, currentColor 5%, transparent);
}
/* 내용 폭으로 잡되 컨테이너보다 좁으면 100%로 늘려 가운데 정렬을 유지한다.
   overflow 중인 grid를 center로 두면 시작 쪽이 스크롤로 닿지 않는 자리에 갇힌다. */
.flow {
    @apply grid justify-center items-center px-4 py-6;
    grid-template-columns: auto auto auto auto auto;
    row-gap: 0.6rem;
    width: max-content;
    min-width: 100%;
}

/* 서비스 점선 테두리 — 제목 행부터 마지막 서버 행까지를 덮는 배경 항목.
   음수 마진으로 상자 바깥쪽에 여백을 만든다(격자 칸 자체를 넓히지 않는다). */
.flow-frame {
    /* 격자가 items-center라 내용 없는 칸은 높이 0으로 접힌다 — stretch로 행 전체를 덮는다. */
    @apply rounded-xl self-stretch;
    margin: -0.7rem 0;
    border: 1.5px dashed color-mix(in srgb, currentColor 32%, transparent);
    background: color-mix(in srgb, currentColor 4%, transparent);
}
.flow-title {
    @apply relative text-center text-xs font-semibold pb-0.5;
    color: var(--c-text-1);
}
.flow-cell {
    @apply relative px-3;
}

/* 양끝 상자는 서비스 점선 테두리와 위아래 선을 맞춰 한 화면에 꽉 차 보이게 한다. */
.flow-side {
    @apply flex self-stretch shrink-0;
    margin: -0.7rem 0;
}

.flow-link {
    @apply flex flex-col justify-center gap-2.5 shrink-0 px-3;
    min-width: 8rem;
}
.flow-arrow {
    @apply flex flex-col;
}
/* 라벨이 열 너비를 정한다. 한 줄로 못 박으면 문장이 긴 언어(ru·de·pt…)에서 도표가
   본문 폭을 넘어 잘려 보이므로, 상한을 두고 넘치면 접는다 — 짧은 언어는 그대로 한 줄. */
.flow-label {
    @apply text-center mx-auto mb-1;
    max-width: 8.5rem;
    word-break: keep-all;
    font-size: 11px;
    line-height: 1.45;
    color: var(--c-text-2);

    &.issuer {
        color: var(--c-accent-1);
    }
    &.verifier {
        color: var(--c-link-1);
    }
}

/* 화살표 몸통 — 끝에 삼각형 화살촉을 붙인다. */
.flow-line {
    @apply relative;
    --arrow: color-mix(in srgb, var(--c-text-1) 45%, transparent);
    border-top: 1.5px solid var(--arrow);

    &.issuer {
        --arrow: color-mix(in srgb, var(--c-accent-1) 60%, transparent);
    }
    &.verifier {
        --arrow: color-mix(in srgb, var(--c-link-1) 60%, transparent);
    }
    /* 인증서 동기화선은 색이 아니라 점선으로 구별한다 — 색은 상대 서버를 따른다. */
    &.sync {
        border-top-style: dashed;
    }

    &::before,
    &::after {
        content: '';
        @apply absolute;
        top: -5.5px;
        border-top: 4.75px solid transparent;
        border-bottom: 4.75px solid transparent;
    }
    &.right::after {
        right: -1px;
        border-left: 8px solid var(--arrow);
    }
    &.left::before {
        left: -1px;
        border-right: 8px solid var(--arrow);
    }
}

.flow-box {
    @apply relative flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap;
    color: var(--c-text-1);
    background: color-mix(in srgb, currentColor 8%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);

    /* 유저 · CMS 상자는 도표 높이를 그대로 채운다. */
    &.tall {
        @apply flex-1 flex-col gap-2 px-4;
    }

    .material-symbols-outlined {
        @apply text-base! leading-none;
    }

    &.issuer {
        background: color-mix(in srgb, var(--c-accent-1) 12%, transparent);
        border-color: color-mix(in srgb, var(--c-accent-1) 45%, transparent);

        .material-symbols-outlined {
            color: var(--c-accent-1);
        }
    }
    &.verifier {
        background: color-mix(in srgb, var(--c-link-1) 12%, transparent);
        border-color: color-mix(in srgb, var(--c-link-1) 45%, transparent);

        .material-symbols-outlined {
            color: var(--c-link-1);
        }
    }
    &.cms {
        background: color-mix(in srgb, var(--c-accent-2) 14%, transparent);
        border-color: color-mix(in srgb, var(--c-accent-2) 50%, transparent);

        .material-symbols-outlined {
            color: var(--c-accent-2);
        }
    }
}
.flow-box-title {
    @apply flex items-center justify-center gap-1.5;
}
.flow-box-note {
    @apply text-center font-normal whitespace-normal;
    /* 한국어는 어절 중간에서 끊기면 읽기 나쁘다 — 낱말 단위로만 줄을 바꾼다. */
    word-break: keep-all;
    max-width: 11rem;
    font-size: 11px;
    line-height: 1.55;
    color: var(--c-text-2);
}
</style>
