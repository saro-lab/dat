<template>
  <div class="relative select-language">
    <div class="text-[0.9rem]! g-link-hover font-medium cursor-pointer flex items-center" open-lang-list-btn>
      <span translate="no" class="material-symbols-outlined text-[0.9rem]! mr-1" open-lang-list-btn>language</span>
      <span open-lang-list-btn>{{langName}}</span>
    </div>
    <div v-if="showLangList" class="absolute top-8 -right-1.5 text-center">
      <div class="absolute isolate inset-0 -z-1! g-glass rd-box"></div>
      <div class="text-sm! my-3 px-6 g-link-hover" v-for="lang in languageRandom()" @click="applyLanguage(lang[0])">{{lang[1]}}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {useData} from "vitepress";
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
import {applyLanguage, languageList, languageRandom} from "../src/langs";

const { site, frontmatter, page, isDark, lang, localeIndex } = useData();

const root = computed<string>(() => `/${localeIndex.value}`.replace(/^\/root/, ''));
const langName = computed<any>(() => languageList[localeIndex.value] || '-');
const showLangList = ref(false);

function hideLangList(event: MouseEvent) {
  if (showLangList.value) {
    showLangList.value = false;
  } else if ((event.target as HTMLElement).matches('[open-lang-list-btn]')) {
    showLangList.value = true;
  }
}

onMounted(() => {
  document.addEventListener('click', hideLangList);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', hideLangList);
})
</script>
