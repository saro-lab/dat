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

<div class="text-base font-bold"><a href="/de/intro">Was ist DAT?</a></div>
<div class="text-sm">DAT (Distributed Access Token) ist ein verteiltes Authentifizierungstoken (Session), das gleichzeitig hohe Leistung und Sicherheit bietet.</div>


<div class="mt-3">
    <div class="text-sm font-bold">{{t('platform_support')}}</div>
    <a :href="tag.link" v-for="tag in tags" class="mr-1.5 inline-block text-sm">{{tag.name}}</a>
</div>

<div class="mt-3">
    <div class="text-sm font-bold">{{t('dat_cms')}}</div>
    <a href="/de/svc/docker-saro-lab-dat-cms" class="mr-1.5 inline-block text-sm">
        Kubernetes (replicas), Docker, Binary (Linux, macOS, Windows)
    </a>
</div>

</div>

<DatExample />
