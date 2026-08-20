<!--
  포트별 지원 매트릭스. 행은 언어/구현체, 열은 기능이고 칸은 지원(✓)·미지원(✕)·
  부분 지원(◐) 또는 임의의 짧은 문자열을 그린다. 공식 클라이언트를 한눈에 비교하는
  용도라 열이 늘어나기 쉬우므로 가로 스크롤이 기본이고, 첫 열은 sticky로 붙여
  스크롤 중에도 어떤 언어의 행인지 잃지 않게 한다.

  기호만으로는 색맹 사용자에게 정보가 전달되지 않으므로 title 속성과 범례로
  이중 표기한다. 라벨은 전부 props로 받는다.
-->
<template>
  <div class="sm my-4">
    <div v-if="title" class="sm-title">{{ title }}</div>
    <div class="sm-scroll">
      <table class="sm-table">
        <thead>
          <tr>
            <th class="sm-head sm-first">{{ corner || '' }}</th>
            <th v-for="col in columns" :key="col.key" class="sm-head">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in rows" :key="ri">
            <th class="sm-row-head sm-first">
              <a v-if="row.link" :href="`${root}${row.link}`">{{ row.label }}</a>
              <span v-else>{{ row.label }}</span>
            </th>
            <td v-for="(col, ci) in columns" :key="col.key" class="sm-cell" :class="cellKind(row.cells[ci])">
              <span :title="cellTitle(row.cells[ci])">{{ cellText(row.cells[ci]) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="sm-legend">
      <span class="sm-key"><i class="sm-sample yes">✓</i>{{ legend?.yes ?? 'supported' }}</span>
      <span class="sm-key"><i class="sm-sample partial">◐</i>{{ legend?.partial ?? 'partial' }}</span>
      <span class="sm-key"><i class="sm-sample no">✕</i>{{ legend?.no ?? 'not supported' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoot } from '../src/langs'

export type MatrixColumn = { key: string; label: string }
export type MatrixCell = boolean | 'partial' | string
export type MatrixRow = {
  label: string
  link?: string
  cells: MatrixCell[]
}

const props = defineProps<{
  columns: MatrixColumn[]
  rows: MatrixRow[]
  title?: string
  corner?: string
  legend?: { yes?: string; no?: string; partial?: string }
}>()

const root = useRoot()

function cellKind(cell: MatrixCell): string {
  if (cell === true) {
    return 'yes'
  }
  if (cell === false || cell === undefined) {
    return 'no'
  }
  if (cell === 'partial') {
    return 'partial'
  }
  return 'text'
}

function cellText(cell: MatrixCell): string {
  if (cell === true) {
    return '✓'
  }
  if (cell === false || cell === undefined) {
    return '✕'
  }
  if (cell === 'partial') {
    return '◐'
  }
  return cell
}

function cellTitle(cell: MatrixCell): string {
  const kind = cellKind(cell)
  if (kind === 'yes') {
    return props.legend?.yes ?? 'supported'
  }
  if (kind === 'no') {
    return props.legend?.no ?? 'not supported'
  }
  if (kind === 'partial') {
    return props.legend?.partial ?? 'partial'
  }
  return String(cell)
}
</script>

<style scoped>
@reference 'tailwindcss';

.sm-title {
    @apply text-[0.7rem] font-semibold uppercase tracking-[0.08em] mb-2;
    color: var(--c-muted);
}

.sm-scroll {
    @apply overflow-x-auto rounded-lg;
    background: color-mix(in srgb, currentColor 5%, transparent);
}
.sm-table {
    @apply w-full;
    border-collapse: separate;
    border-spacing: 0;
}

.sm-head {
    @apply px-2.5 py-2 text-center whitespace-nowrap font-semibold;
    font-size: 11px;
    color: var(--c-text-2);
    border-bottom: 1px solid color-mix(in srgb, currentColor 18%, transparent);
}

.sm-row-head {
    @apply px-2.5 py-1.5 text-start whitespace-nowrap font-medium;
    font-size: 12px;
    color: var(--c-text-1);
    border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);

    a:hover {
        color: var(--c-link-1);
    }
}

.sm-first {
    @apply sticky start-0 z-10;
    background: var(--c-bg);
    border-inline-end: 1px solid color-mix(in srgb, currentColor 18%, transparent);
}

.sm-cell {
    @apply px-2.5 py-1.5 text-center whitespace-nowrap;
    font-size: 12px;
    border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);

    &.yes { color: var(--c-accent-1); @apply font-semibold; }
    &.partial { color: var(--c-chart-3); @apply font-semibold; }
    &.no { color: color-mix(in srgb, var(--c-text-1) 35%, transparent); }
    &.text { color: var(--c-text-2); }
}

.sm-legend {
    @apply flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5;
}
.sm-key {
    @apply inline-flex items-center gap-1.5;
    font-size: 11px;
    color: var(--c-text-2);
}
.sm-sample {
    @apply inline-block not-italic font-semibold;

    &.yes { color: var(--c-accent-1); }
    &.partial { color: var(--c-chart-3); }
    &.no { color: color-mix(in srgb, var(--c-text-1) 35%, transparent); }
}
</style>
