<h1>{{ t('tool_bytes_title') }}</h1>

<ToolBytes />

<script setup lang="ts">
import ToolBytes from '../../.vitepress/ui/ToolBytes.vue';
import { useTranslate } from '../../.vitepress/src/langs';

const { t } = useTranslate();
</script>
