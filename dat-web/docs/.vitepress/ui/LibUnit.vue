<template>
  <div v-if="extCode.length > 0" class="md">
    <div class="repo" v-for="node in extCode">
      <CodeBox :lang="node.ext" :code="node.code" />
    </div>
  </div>
</template>


<script setup lang="ts">
import {Library, getExtCode} from "../src/libs";
import CodeBox from "./CodeBox.vue";

const props = defineProps<{lib: Library}>();
const lib = props.lib;

const extCode = getExtCode(lib);
</script>

<style scoped>
@reference 'tailwindcss';

.repo {
  @apply mt-4;
}
</style>