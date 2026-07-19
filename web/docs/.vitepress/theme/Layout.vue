

<template>
  <div class="mb-16 @container/layout">
    <div v-if="localeIndex !== 'root'" >
      <!-- header -->
      <div class="g-glass drop-none @min-md:border-b! absolute w-full z-50 text-[0.9rem]">
        <div class="g-frame g-frame-full">
          <div class="header-content select-none flex items-center h-[3rem] gap-3 px-1.5 @max-[46rem]:px-2.5">
            <span translate="no" v-if="hasMenu" class="g-menu-toggle-btn material-symbols-outlined text-xl! font-extralight cursor-pointer @min-[60rem]:hidden!" @click="onMenu = !onMenu">menu</span>
            <a :href="`${root}/`" class="font-medium text-[1rem]">DAT</a>
            <div class="flex-1"></div>

            <div>
              <a :href="`${root}/intro`" class="font-medium g-link-hover">{{t('menu_docs')}}</a>
            </div>

<!--            <span translate="no" class="material-symbols-outlined text-[0.9rem]! font-bold! g-link-hover cursor-pointer" :title="t('search')" @click="onSearch = true">search</span>-->

            <div @click="isDark = !isDark" class="g-link-hover">
              <span translate="no" class="material-symbols-outlined text-[0.9rem]! font-bold!">
                {{isDark ? 'dark_mode' : 'light_mode'}}
              </span>
            </div>

            <SelectLanguage />

          </div>
        </div>
      </div>

      <div class="h-[3rem]"><!-- header gap --></div>

      <div class="mt-4 g-frame g-frame-full" :class="hasMenu ? 'flex justify-center gap-[1rem]' : ''">
        <Menu v-if="hasMenu" v-model="onMenu" />
        <div v-if="hasPage" :class="hasMenu ? 'g-glass rd-box g-frame flex-1 md' : ''">
          <Content />
        </div>
        <div v-else class="flex-1 g-glass rd-box">
          <div class="pt-[9rem] pb-[10rem]">
            <div class="text-3xl text-center">404<br/><br/>{{t('page_not_found')}}</div>
          </div>
        </div>
      </div>
    </div>

<!--    <Search v-if="onSearch" @close="onSearch = false" />-->
  </div>

</template>



<script setup lang="ts">
import {Content, useData, useRouter} from 'vitepress'
import {computed, onMounted, ref} from "vue";
import {applyLanguage, useTranslate} from "../src/langs";
const {t} = useTranslate();
// @ts-ignore
import Search from "../ui/Search.vue";
// @ts-ignore
import SelectLanguage from "../ui/SelectLanguage.vue";
// @ts-ignore
import Menu from "../ui/Menu.vue";

// https://vitepress.dev/reference/runtime-api#usedata
const { site, frontmatter, page, isDark, lang, localeIndex } = useData();

const root = computed(() => `/${localeIndex.value}`.replace(/^\/root/, ''));

const onSearch = ref(false);

const hasPage = computed(() => !page.value.isNotFound);
const hasMenu = computed(() => hasPage.value && frontmatter.value?.layout !== 'home');

const onMenu = ref(false);

useRouter().onBeforeRouteChange = (to) => {
  onMenu.value = false
  onSearch.value = false
}

onMounted(async () => {
  if (page.value.isNotFound) {
    document.title = 'DAT'
  }
  await applyLanguage();
});


</script>

<style scoped>
.header-content, .header-content * {
  line-height: 1;
}
</style>