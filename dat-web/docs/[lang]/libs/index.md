# {{t('menu_libs_index')}}

{{t('libs_intro')}}

<LibraryList />

<script setup lang="ts">
import LibraryList from '../../.vitepress/ui/LibraryList.vue';
import { useTranslate } from '../../.vitepress/src/langs';
const { t } = useTranslate();
</script>
