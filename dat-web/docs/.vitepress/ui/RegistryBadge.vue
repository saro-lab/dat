<template>
  <a v-for="link in links" :key="link.url" :href="link.url" target="_blank" rel="noopener" class="reg-badge">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
    <span>{{ link.name }}</span>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { findLibraryByPath, getRegistryLinks, type Library } from '../src/libs';

const props = defineProps<{
  lib?: Library
}>();

const { page } = useData();
const links = computed(() => {
  const lib = props.lib ?? findLibraryByPath(page.value.relativePath);
  return lib ? getRegistryLinks(lib) : [];
});
</script>

<style scoped>
@reference 'tailwindcss';

.reg-badge {
    @apply inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-150;
    background: color-mix(in srgb, currentColor 8%, transparent);
    color: var(--c-text-1);

    &:hover {
        background: color-mix(in srgb, var(--c-link-1) 20%, transparent);
        color: var(--c-link-1);
    }

    svg {
        flex-shrink: 0;
    }
}
</style>
