<template>
  <div :class="`language-${props.lang}`">
    <button :title="t('copy_code')" class="copy" @click="doCopyToClipboard($event?.target, copy)"></button>
    <span class="lang">{{ props.lang }}</span>
    <div v-html="hl"></div>
  </div>
</template>


<script setup lang="ts">
import {nextTick, onMounted, ref, watch} from "vue";
import {doCopyToClipboard, getHighlighter} from "../src/comm";
import {useTranslate} from "../src/langs";

const {t} = useTranslate();

const props = defineProps<{
  lang: string
  code: string
}>();

let copy = ref('');
let hl = ref('');
let highlighter: any|null = null;

function make(lang: string, code: string) {
  if (!highlighter) {
    return;
  }
  copy.value = code;
  hl.value = highlighter.codeToHtml(code, {
    lang: lang,
    themes: {
      light: 'github-light',
      dark: 'github-dark'
    },
    defaultColor: false
  } as any);
}

watch(
    [() => props.lang, () => props.code],
    async ([newLang, newCode], [oldLang, oldCode]) => {
      make(newLang, newCode);
    },
    { immediate: false }
);

onMounted(async () => {
  highlighter = await getHighlighter();
  await nextTick(() => make(props.lang, props.code));
});
</script>
