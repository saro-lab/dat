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

<div class="text-base font-bold"><a href="/ko/intro">DAT란?</a></div>
<div class="text-sm">DAT(Distributed Access Token)는 고성능과 보안을 동시에 실현하는 분산 인증 토큰 (Session) 입니다.</div>


<div class="mt-3">
    <div class="text-sm font-bold">{{t('platform_support')}}</div>
    <a :href="tag.link" v-for="tag in tags" class="mr-1.5 inline-block text-sm">{{tag.name}}</a>
</div>

<div class="mt-3">
    <div class="text-sm font-bold">{{t('dat_cms')}}</div>
    <a href="/ko/svc/docker-saro-lab-dat-cms" class="mr-1.5 inline-block text-sm">
        Kubernetes (replicas), Docker, Binary (Linux, macOS, Windows)
    </a>
</div>

</div>

<DatExample />
