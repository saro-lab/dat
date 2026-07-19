# All Libraries

<LibUnit v-for="lib in libs" :key="lib.repositories.join(',') + lib.id" :lib="lib" />

<script setup lang="ts">
import LibUnit from '../../.vitepress/ui/LibUnit.vue';
import { getAllLibraries } from '../../.vitepress/src/libs';
const libs = getAllLibraries();
</script>
