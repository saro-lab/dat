<template>
  <nav v-if="prevItem || nextItem" class="pn-row">
    <a v-if="prevItem" :href="root + prevItem.path" class="pn-box pn-prev">
      <span translate="no" class="material-symbols-outlined arrow">arrow_back</span>
      <div class="pn-text">
        <div class="pn-lbl">{{ t('nav_prev') }}</div>
        <div class="pn-title">{{ label(prevItem) }}</div>
      </div>
    </a>
    <div v-else class="pn-spacer"></div>
    <a v-if="nextItem" :href="root + nextItem.path" class="pn-box pn-next">
      <div class="pn-text">
        <div class="pn-lbl">{{ t('nav_next') }}</div>
        <div class="pn-title">{{ label(nextItem) }}</div>
      </div>
      <span translate="no" class="material-symbols-outlined arrow">arrow_forward</span>
    </a>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoot, useTranslate } from '../src/langs'
import { useCurrentPath, usePageOrder, type NavLink } from '../src/nav'

const { t } = useTranslate()
const root = useRoot()
const currentPath = useCurrentPath()
const pageOrder = usePageOrder()

const index = computed(() => pageOrder.value.findIndex((entry) => entry.path === currentPath.value))
const prevItem = computed(() => (index.value > 0 ? pageOrder.value[index.value - 1] : null))
const nextItem = computed(() => (index.value < 0 ? null : pageOrder.value[index.value + 1] || null))

function label(entry: NavLink): string {
  return entry.title || t(entry.navKey || entry.titleKey!)
}
</script>

<style scoped>
@reference 'tailwindcss';

.pn-row {
    @apply flex gap-3 mt-8 pt-4;
    border-top: var(--divider);
}
.pn-box {
    @apply flex items-center gap-2 flex-1 p-3 rounded-md min-w-0 transition-colors duration-150;
    background: color-mix(in srgb, currentColor 5%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 6%, transparent);

    &:hover {
        background: color-mix(in srgb, currentColor 10%, transparent);
    }
}
.pn-next {
    @apply justify-end text-right;
}
.pn-spacer {
    @apply flex-1;
}
.pn-text {
    @apply min-w-0;
}
.pn-lbl {
    @apply text-xs opacity-50 font-bold;
}
.pn-title {
    @apply text-sm font-bold truncate;
}
.arrow {
    @apply text-lg! opacity-60;
}
</style>
