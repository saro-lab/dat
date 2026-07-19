<template>
  <div v-if="model?.length" class="mt-3">
    <div v-for="node in model" class="node mb-1 break-all">
      <div :class="`tag-${node.tag || 'error'}`">
        <span class="tag">{{ node.tag?.toUpperCase() || 'ERROR' }}:</span>
        {{node.message || ''}}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export class LogItem {
  readonly tag: 'error' | 'warn' | 'ok' | 'info' = 'error';
  readonly message: string = 'message';
  constructor(tag: 'error' | 'warn' | 'ok' | 'info', message: string) {
    this.tag = tag;
    this.message = message;
  }

  static error(message: string): LogItem {
    return new LogItem('error', message)
  }
  static warn(message: string): LogItem {
    return new LogItem('warn', message)
  }
  static info(message: string): LogItem {
    return new LogItem('info', message)
  }
  static ok(message: string): LogItem {
    return new LogItem('ok', message)
  }
}
</script>

<script setup lang="ts">
const model = defineModel({
  type: Array as () => LogItem[],
  required: true
});

</script>

<style scoped>
@reference 'tailwindcss';

.node .tag-ok {
  @apply text-green-500;
}
.node .tag-info {
  @apply text-blue-500;
}
.node .tag-warn {
  @apply text-orange-500;
}
.node .tag-error {
  @apply text-red-500;
}
</style>