---
layout: home
---

<script setup lang="ts">
import {computed} from "vue";
import {useData} from "vitepress";
import {getLibTags} from "../.vitepress/src/libs";
import {useTranslate} from "../.vitepress/src/langs";
import DatExample from "../.vitepress/ui/DatExample.vue";
const {localeIndex} = useData();
const {t} = useTranslate();
const root = computed(() => localeIndex.value === 'root' ? '' : '/' + localeIndex.value);
const tags = getLibTags(root.value);
</script>

<div class="g-glass rd-box md">

<div class="text-base font-bold"><a href="/hi/intro">DAT क्या है?</a></div>
<div class="text-sm">DAT (Distributed Access Token) एक वितरित प्रमाणीकरण टोकन (Session) है जो एक साथ उच्च प्रदर्शन और सुरक्षा प्रदान करता है।</div>


<div class="mt-3">
    <div class="text-sm font-bold">{{t('platform_support')}}</div>
    <a :href="tag.link" v-for="tag in tags" class="mr-1.5 inline-block text-sm">{{tag.name}}</a>
</div>

<div class="mt-3">
    <div class="text-sm font-bold">{{t('dat_cms')}}</div>
    <a href="/hi/svc/docker-saro-lab-dat-cms" class="mr-1.5 inline-block text-sm">
        Kubernetes (replicas), Docker, Binary (Linux, macOS, Windows)
    </a>
</div>

</div>

<DatExample />
