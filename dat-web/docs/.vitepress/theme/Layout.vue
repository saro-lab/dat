<template>
  <div class="mb-16 @container/layout">
    <template v-if="localeIndex !== 'root'">
      <header class="g-glass drop-none @min-md:border-b! absolute w-full z-50 text-[0.9rem]">
        <div class="g-frame g-frame-full">
          <div class="header-content select-none flex items-center h-[3rem] gap-1 px-1.5 @max-[46rem]:px-2">
            <!-- 아이콘 폰트 CSS가 display를 덮어쓰므로 hdr-btn은 항상 래퍼로 쓴다 -->
            <div v-if="hasMenu" class="hdr-btn g-link-hover @min-[60rem]:hidden!" @click="onMenu = !onMenu">
              <span translate="no" class="material-symbols-outlined text-xl! font-extralight">menu</span>
            </div>
            <a :href="`${root}/`" class="font-medium text-[1rem] px-1">DAT</a>
            <div class="flex-1"></div>

            <a :href="`${root}/intro`" class="hdr-btn px-2 font-medium g-link-hover">{{ t('menu_docs') }}</a>

            <div class="hdr-btn g-link-hover" @click="isDark = !isDark">
              <span translate="no" class="material-symbols-outlined text-[1.05rem]! font-bold!">
                {{ isDark ? 'dark_mode' : 'light_mode' }}
              </span>
            </div>

            <SelectLanguage />
          </div>
        </div>
      </header>

      <div class="h-[3rem]"><!-- header gap --></div>

      <!-- items-start: 사이드바와 본문은 각자 자기 내용만큼만 높아진다 (짧은 쪽이 늘어나지 않게) -->
      <div class="mt-4 g-frame g-frame-full" :class="hasMenu ? 'flex items-start justify-center gap-[1rem]' : ''">
        <Menu v-if="hasMenu" v-model="onMenu" />
        <main v-if="hasPage" :class="hasMenu ? 'g-glass rd-box g-frame flex-1 md' : ''">
          <Content />
          <PageNav v-if="hasMenu" />
        </main>
        <div v-else class="flex-1 g-glass rd-box">
          <div class="pt-[9rem] pb-[10rem]">
            <div class="text-3xl text-center">404<br /><br />{{ t('page_not_found') }}</div>
          </div>
        </div>
      </div>
    </template>

    <!-- Shown at the un-prefixed root, which redirects to a language as soon as JS runs. -->
    <div v-else class="g-frame pt-[9rem] pb-[10rem] text-center">
      <div class="text-3xl">DAT</div>
      <div class="mt-8 flex flex-wrap justify-center gap-6">
        <a v-for="[code, name] in languages" :key="code" :href="`/${code}/`" class="g-link">{{ name }}</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Content, useData, useRouter } from 'vitepress'
import { computed, onMounted, ref } from 'vue'

import Menu from '../ui/Menu.vue'
import PageNav from '../ui/PageNav.vue'
import SelectLanguage from '../ui/SelectLanguage.vue'
import { applyLanguage, languageList, useRoot, useTranslate } from '../src/langs'

const { t } = useTranslate()

// https://vitepress.dev/reference/runtime-api#usedata
const { page, frontmatter, isDark, localeIndex } = useData()

const root = useRoot()

/** Shown at the un-prefixed root, which redirects to a language as soon as JS runs. */
const languages = Object.entries(languageList)

const hasPage = computed(() => !page.value.isNotFound)
const hasMenu = computed(() => hasPage.value && frontmatter.value?.layout !== 'home')

const onMenu = ref(false)

useRouter().onBeforeRouteChange = () => {
  onMenu.value = false
}

onMounted(() => {
  if (page.value.isNotFound) {
    document.title = 'DAT'
  }
  applyLanguage()
})
</script>

<style scoped>
.header-content,
.header-content * {
  line-height: 1;
}
</style>
