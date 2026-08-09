<template>
  <div class="lib-list">
    <div v-for="lib in libs" :key="lib.link" class="lib-block">
      <div class="lib-head">
        <a :href="`${root}${lib.link}`" class="lib-title">
          <span class="lib-icon">{{ REPO_ICON[lib.repositories[0]] ?? DEFAULT_ICON }}</span>
          {{ lib.languages.join(', ') }}
        </a>
        <GithubBadge :href="lib.repo" label="GitHub" />
      </div>
      <LibUnit :lib="lib" class="no-title" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import LibUnit from './LibUnit.vue';
import GithubBadge from './GithubBadge.vue';
import { getAllLibraries, type Library, type LibraryRepository } from '../src/libs';
import { useRoot } from '../src/langs';

const DEFAULT_ICON = '📦';
const REPO_ICON: Partial<Record<LibraryRepository, string>> = {
  Cargo: '🦀',
  Maven: '☕',
  Npm: '📦',
  Pypi: '🐍',
  Nuget: '🟩',
  Go: '🐹',
  Gems: '💎',
  Vcpkg: '🔧',
};

const root = useRoot();
const libs = ref<Library[]>(getAllLibraries());

onMounted(() => {
  libs.value = [...libs.value].sort(() => Math.random() - 0.5);
});
</script>

<style scoped>
@reference 'tailwindcss';

.lib-list {
    @apply mt-5;
}
.lib-block {
    @apply pt-4 pb-1 mb-2;
    border-top: 1px solid color-mix(in srgb, currentColor 10%, transparent);

    &:first-child {
        border-top: none;
        @apply pt-0;
    }
}
.lib-head {
    @apply flex items-center justify-between gap-2;
}
.lib-title {
    @apply text-[0.95rem] font-semibold inline-flex items-center gap-1.5;
    color: var(--c-text-1);

    &:hover {
        color: var(--c-link-1);
    }
}
.lib-icon {
    @apply text-lg leading-none;
}
</style>
