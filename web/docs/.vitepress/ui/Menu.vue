<template>
  <div class="g-menu" :class="onMenu ? 'g-menu-on' : ''">
    <div class="g-glass md rd-box">
      <div translate="no" class="material-symbols-outlined g-menu-close" @click="toggle">close</div>
      <div class="menu-title">{{t('menu_intro')}}</div>
      <div>
        <div class="menu-item"><a :href="`${root}/intro`">{{t('menu_intro_index')}}</a></div>
      </div>
      <hr/>
      <div class="menu-title">{{t('menu_spec')}}</div>
      <div>
        <div class="menu-item"><a :href="`${root}/spec/dat`">{{t('menu_spec_dat')}}</a></div>
        <div class="menu-item"><a :href="`${root}/spec/dat-certificate`">{{t('menu_spec_cert')}}</a></div>
      </div>
      <hr/>
      <div class="menu-title">{{t('menu_libs')}}</div>
      <div>
        <div class="menu-item"><a :href="`${root}/libs/`">{{t('menu_libs_index')}}</a></div>
        <div class="menu-item"><a :href="`${root}/libs/cargo-dat`">Rust (cargo)</a></div>
        <div class="menu-item"><a :href="`${root}/libs/maven-me.saro-dat`">Java (maven)</a></div>
        <div class="menu-item"><a :href="`${root}/libs/npm-saro-dat`">Javascript (npm)</a></div>
        <div class="menu-item"><a :href="`${root}/libs/pypi-saro-dat`">Python (pypi)</a></div>
        <div class="menu-item"><a :href="`${root}/libs/nuget-saro-dat`">C# (nuget)</a></div>
        <div class="menu-item"><a :href="`${root}/libs/go-saro-dat`">Go</a></div>
        <div class="menu-item"><a :href="`${root}/libs/gems-saro-dat`">Ruby (gems)</a></div>
        <div class="menu-item"><a :href="`${root}/libs/vcpkg-dat`">C/C++ (vcpkg)</a></div>
      </div>
      <hr/>
      <div class="menu-title">{{t('menu_svc')}}</div>
      <div>
        <div class="menu-item"><a :href="`${root}/svc/docker-saro-lab-dat-cms`">{{t('menu_svc_cms')}}</a></div>
      </div>
      <hr/>
      <div class="menu-title">{{t('menu_tool')}}</div>
      <div>
        <div class="menu-item"><a :href="`${root}/tool/bytes`">{{t('menu_tool_bytes')}}</a></div>
        <div class="menu-item"><a :href="`${root}/tool/time`">{{t('menu_tool_time')}}</a></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {useData} from "vitepress";
import {computed} from "vue";
import {useTranslate} from "../src/langs";
const {t} = useTranslate();
const onMenu = defineModel({
  type: Boolean,
  required: true
});
const { localeIndex } = useData();

const root = computed(() => `/${localeIndex.value}`.replace(/^\/root/, ''));

const toggle = () => {
  onMenu.value = !onMenu.value;
};
</script>

<style>
@reference 'tailwindcss';
.g-menu {
  @variant max-[60rem] {
    &:not(.g-menu-on) {
      @apply hidden;
    }
    @apply absolute top-[3rem] bottom-0 z-70 pt-[1rem];
    @apply w-[46rem] max-w-full;
    > div {
      @apply m-0! max-w-[30rem] backdrop-blur-xl;
    }

    .g-menu-close {
      @apply absolute top-0 right-0 p-2 text-(--c-text-2) cursor-pointer text-2xl;
    }
  }
  @variant min-[60rem] {
    @apply min-w-[13rem];
    .g-menu-close { @apply hidden; }
  }
  hr {
    @apply my-3!;
  }
  .menu-title {
    @apply text-sm font-bold mb-0.5;
    @variant max-[40rem] {
      @apply text-2xl mb-2;
    }
  }
  .menu-item {
    @apply py-0.5 text-sm font-semibold;
    @variant max-[40rem] {
      @apply text-lg mb-1;
    }
  }
}

</style>