<template>
  <div v-if="extCode.length > 0" class="md">
    <div class="title">
      <span class="lang">{{lib.languages.join(', ')}}</span>
      <a translate="no" class="material-symbols-outlined text-base! align-text-top!" :href="link()">home_and_garden</a>
    </div>
    <div class="repo" v-for="node in extCode">
      <CodeBox :lang="node.ext" :code="node.code" />
    </div>
  </div>
</template>


<script setup lang="ts">
import {Library, getExtCode} from "../src/libs";
import {computed, ref, watch} from "vue";
import {useData} from "vitepress";
import {doCopyToClipboard} from "../src/comm";
import CodeBox from "./CodeBox.vue";
const { site, frontmatter, page, isDark, lang, localeIndex } = useData();

const props = defineProps<{lib: Library}>();
const root = computed(() => `/${localeIndex.value}`.replace(/^\/root/, ''));
const lib = props.lib;

const extCode = getExtCode(lib);

function link(): string {
  if (lib.link.startsWith('/')) {
    return `${root.value}${lib.link}`;
  } else {
    return lib.link;
  }
}

</script>

<style scoped>
@reference 'tailwindcss';
@custom-variant light (&:where(html.light *));
@custom-variant dark (&:where(html.dark *));
@variant dark (&:where(.dark, .dark *));

.lang {
  @apply mr-1.5 text-sm font-bold;
}
.title {
  @apply mt-5;
}
.no-title .title {
  @apply hidden;
}
.repo {
  @apply mt-4;
}
</style>