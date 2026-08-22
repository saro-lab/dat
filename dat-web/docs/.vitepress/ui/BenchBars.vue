<template>
  <div class="bench-bars g-ltr">
    <div class="bb-filter">
      <button
        v-for="mode in threads"
        :key="mode.key"
        class="bb-sig"
        :class="{ on: thread === mode.key }"
        @click="thread = mode.key"
      >
        {{ t(mode.labelKey) }}
      </button>
    </div>

    <div class="bb-filter">
      <button
        v-for="sig in BENCH_SIGS"
        :key="sig"
        class="bb-sig"
        :class="{ on: selected.includes(sig) }"
        @click="toggle(sig)"
      >
        {{ sig }}
      </button>
    </div>

    <div v-for="panel in visiblePanels" :key="panel.key" class="bb-panel">
      <div class="bb-title">
        {{ t(panel.opKey) }}
        <span class="bb-title-thread">({{ t(panel.threadKey) }})</span>
      </div>
      <div class="bb-rows">
        <div v-for="row in rows(panel)" :key="`${row.target}-${row.sig}`" class="bb-row">
          <span class="bb-name">
            {{ row.target }}
            <span class="bb-name-sig">{{ SIG_SHORT[row.sig] ?? row.sig }}</span>
          </span>
          <div class="bb-track">
            <div class="bb-bar" :style="{ width: `${row.pct}%`, background: color(row.si) }"></div>
          </div>
          <span class="bb-val">{{ row.value.toLocaleString('en-US') }} ms</span>
        </div>
      </div>
    </div>

    <div class="bb-note">{{ t('bench_note') }}</div>

    <details class="bb-details">
      <summary>{{ t('bench_table') }}</summary>
      <div v-for="thread in threads" :key="thread.key" class="bb-table-wrap g-xscroll" @pointerdown="dragScroll">
        <div class="bb-panel-title">{{ thread.title }}</div>
        <table class="bb-table">
          <thead>
            <tr>
              <th rowspan="2" class="bb-th-alg">Signature · Crypto</th>
              <th v-for="s in series" :key="s.target" colspan="2">{{ s.target }}</th>
            </tr>
            <tr>
              <template v-for="s in series" :key="s.target">
                <th>Issue</th>
                <th>Parse</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in combos" :key="i">
              <th class="bb-th-alg">{{ c.sig }} · {{ c.crypto }}</th>
              <template v-for="s in series" :key="s.target">
                <td>{{ s[thread.key][i].issueMs.toLocaleString('en-US') }}</td>
                <td>{{ s[thread.key][i].parseMs.toLocaleString('en-US') }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BENCH_CRYPTOS, BENCH_SERIES, BENCH_SIGS } from '../src/bench'
import { useTranslate } from '../src/langs'

const { t } = useTranslate()

const series = BENCH_SERIES

const CRYPTO = 'IV-AES256-GCM'

type PanelDef = {
  key: string
  thread: 'multi' | 'single'
  op: 'issueMs' | 'parseMs'
  opKey: 'bench_issue' | 'bench_parse'
  threadKey: 'bench_multi' | 'bench_single'
}

const panels: PanelDef[] = [
  { key: 'mi', thread: 'multi', op: 'issueMs', opKey: 'bench_issue', threadKey: 'bench_multi' },
  { key: 'mp', thread: 'multi', op: 'parseMs', opKey: 'bench_parse', threadKey: 'bench_multi' },
  { key: 'si', thread: 'single', op: 'issueMs', opKey: 'bench_issue', threadKey: 'bench_single' },
  { key: 'sp', thread: 'single', op: 'parseMs', opKey: 'bench_parse', threadKey: 'bench_single' },
]

const threads = [
  { key: 'multi', title: 'Multi-Thread', labelKey: 'bench_multi' },
  { key: 'single', title: 'Single-Thread', labelKey: 'bench_single' },
] as const

const thread = ref<'multi' | 'single'>('multi')

const visiblePanels = computed(() => panels.filter((panel) => panel.thread === thread.value))

const combos = BENCH_SIGS.flatMap((sig) => BENCH_CRYPTOS.map((crypto) => ({ sig, crypto })))

const SIG_SHORT: Record<string, string> = {
  'HMAC-SHA256-MFS': 'HMAC-256',
  'HMAC-SHA384-MFS': 'HMAC-384',
  'HMAC-SHA512-MFS': 'HMAC-512',
  'ECDSA-P256': 'P256',
  'ECDSA-P384': 'P384',
  'ECDSA-P521': 'P521',
}

const selected = ref<string[]>(['HMAC-SHA512-MFS', 'ECDSA-P256'])

function toggle(sig: string) {
  if (selected.value.includes(sig)) {
    if (selected.value.length > 1) {
      selected.value = selected.value.filter((s) => s !== sig)
    }
  } else {
    selected.value = [...selected.value, sig]
  }
}

const activeSigs = computed(() => BENCH_SIGS.filter((sig) => selected.value.includes(sig)))

function rows(panel: PanelDef) {
  const list = activeSigs.value.flatMap((sig) => {
    const idx = combos.findIndex((c) => c.sig === sig && c.crypto === CRYPTO)
    return series.map((s, si) => ({ target: s.target, sig, si, value: s[panel.thread][idx][panel.op] }))
  })
  const max = Math.max(...list.map((r) => r.value))
  return list
    .sort((a, b) => a.value - b.value)
    .map((r) => ({ ...r, pct: max > 0 ? (r.value / max) * 100 : 0 }))
}

function color(si: number): string {
  return `var(--bb-s${si + 1})`
}

function dragScroll(e: PointerEvent) {
  if (e.button !== 0) {
    return
  }
  const el = e.currentTarget as HTMLElement
  if (el.scrollWidth <= el.clientWidth) {
    return
  }
  const startX = e.clientX
  const startLeft = el.scrollLeft
  const move = (ev: PointerEvent) => {
    el.scrollLeft = startLeft - (ev.clientX - startX)
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    el.classList.remove('dragging')
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  el.classList.add('dragging')
}
</script>

<style>
.bench-bars {
    --bb-s1: #407ac1;
    --bb-s2: #d4724b;
    --bb-s3: #2d9d75;
    --bb-s4: #cf961e;
    --bb-s5: #da89a7;
    --bb-s6: #107310;
    --bb-s7: #544899;
    --bb-s8: #d05c5b;
}
html.dark .bench-bars {
    --bb-s1: #4f89cf;
    --bb-s2: #c3633c;
    --bb-s3: #2a8d6b;
    --bb-s4: #b07d19;
    --bb-s5: #c56185;
    --bb-s6: #107310;
    --bb-s7: #8c83d7;
    --bb-s8: #d16665;
}
</style>

<style scoped>
@reference 'tailwindcss';

.bench-bars {
    @apply my-4;
}

.bb-filter {
    @apply flex flex-wrap gap-1.5 mb-2;

    & + & {
        @apply mb-4;
    }
}
.bb-sig {
    @apply px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer select-none transition-colors duration-150;
    font-variant-numeric: tabular-nums;
    background: var(--ctrl-bg);
    border: 1px solid var(--ctrl-border);
    color: var(--ctrl-fg);

    &:hover {
        background: var(--ctrl-bg-hover);
        border-color: var(--ctrl-border-hover);
    }
    &.on {
        background: var(--ctrl-bg-on);
        border-color: var(--ctrl-border-on);
        color: var(--ctrl-fg-on);
        text-shadow: var(--ctrl-text-shadow-on);
    }
}

.bb-panel {
    @apply rounded-lg p-4 mb-4;
    background: color-mix(in srgb, currentColor 4%, transparent);
}
.bb-panel-title {
    @apply text-[0.72rem] font-semibold uppercase tracking-[0.08em];
    color: var(--c-muted);
}
.bb-title {
    @apply text-[0.9rem] font-semibold;
    color: var(--c-text-1);
}
.bb-title-thread {
    @apply text-[0.72rem] font-normal;
    color: var(--c-muted);
}
.bb-rows {
    @apply mt-2;
}

.bb-row {
    @apply flex items-center gap-2.5 py-[3px] rounded-sm;

    &:hover {
        background: color-mix(in srgb, currentColor 5%, transparent);
    }
}
.bb-name {
    @apply text-xs font-medium truncate shrink-0;
    width: 10rem;
    color: var(--c-text-1);

    @variant max-[46rem] {
        width: 8.5rem;
    }
}
.bb-name-sig {
    @apply text-[10px] font-normal;
    color: var(--c-muted);
    font-variant-numeric: tabular-nums;
}
.bb-track {
    @apply flex-1 min-w-0;
    border-left: 1px solid color-mix(in srgb, currentColor 22%, transparent);
}
.bb-bar {
    @apply h-3.5;
    min-width: 3px;
    border-radius: 0 4px 4px 0;
    transition: width 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.bb-val {
    @apply text-[11px] text-right whitespace-nowrap shrink-0;
    width: 5.2rem;
    font-variant-numeric: tabular-nums;
    color: var(--c-text-2);
}

.bb-note {
    @apply text-[11px] mt-1 leading-relaxed;
    color: color-mix(in srgb, var(--c-text-1) 55%, transparent);
}

.bb-details {
    @apply mt-3;

    summary {
        @apply text-xs font-medium cursor-pointer select-none;
        color: var(--c-link-1);

        &:hover {
            color: var(--c-link-2);
        }
    }
}
.bb-table-wrap {
    @apply mt-3 pb-1;
    cursor: grab;

    &.dragging {
        cursor: grabbing;
        user-select: none;
    }
}
.bb-table {
    @apply text-[11px] whitespace-nowrap;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;

    th,
    td {
        @apply px-2 py-0.5 text-right;
        border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    }
    thead th {
        @apply font-semibold text-center;
        background: color-mix(in srgb, currentColor 5%, transparent);
        color: var(--c-text-1);
    }
    td {
        color: var(--c-text-2);
    }
}
.bb-th-alg {
    @apply text-left font-medium;
    color: var(--c-text-1);
}
</style>
