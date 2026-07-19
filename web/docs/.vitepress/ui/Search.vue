<template>
  <div class="search-overlay" @click.self="emit('close')">
    <div class="search-box g-glass rd-box">
      <div class="flex items-center gap-2">
        <span translate="no" class="material-symbols-outlined text-base! opacity-60">search</span>
        <input
          ref="inputRef"
          class="w-full"
          type="text"
          :placeholder="t('search')"
          v-model="query"
          @input="doSearch"
          @keydown.esc="emit('close')"
        />
        <span translate="no" class="material-symbols-outlined text-base! g-link-hover cursor-pointer" @click="emit('close')">close</span>
      </div>

      <ul v-if="results.length > 0" class="search-results">
        <li v-for="item in results" :key="item.id">
          <a :href="item.id" @click="emit('close')">
            <strong>{{ item.title }}</strong>
            <div class="snippet">{{ item.snippet }}</div>
          </a>
        </li>
      </ul>
      <div v-else-if="query" class="mt-4 text-sm opacity-60 text-center">{{ t('search_no_results') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import MiniSearch from 'minisearch'
import { data as searchData } from '../theme/search.data.js'
import { useData } from 'vitepress'
import { useTranslate } from '../src/langs'

const emit = defineEmits(['close'])
const { localeIndex } = useData()
const { t } = useTranslate()

const query = ref('')
const results = ref([])
const inputRef = ref(null)
let miniSearch = null

onMounted(async () => {
  miniSearch = new MiniSearch({
    fields: ['title', 'text'],
    storeFields: ['title', 'text'],
    searchOptions: { fuzzy: 0.2 },
  })
  miniSearch.addAll(searchData)
  await nextTick()
  inputRef.value?.focus()
})

const doSearch = () => {
  if (!query.value || !miniSearch) {
    results.value = []
    return
  }
  const idPrefix = `/${localeIndex.value}/`
  results.value = miniSearch
    .search(query.value, {
      prefix: true,
      fuzzy: (term) => (term.length > 3 ? 2 : 1),
      combineWith: 'OR',
    })
    .filter((e) => e.id.startsWith(idPrefix))
    .slice(0, 20)
    .map((e) => ({
      id: e.id,
      title: e.title,
      snippet: e.text.replace(/\{\{t\('([^']+)'\)\}\}/g, (_, key) => t(key)).slice(0, 160),
    }))
}
</script>

<style scoped>
@reference 'tailwindcss';

.search-overlay {
  @apply z-100 fixed inset-0 flex items-start justify-center pt-[10vh] px-4;
  background-color: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
}
.search-box {
  @apply w-full max-w-[40rem] max-h-[70vh] overflow-y-auto;
}
.search-results {
  @apply mt-4 flex flex-col gap-1;
  li a {
    @apply block p-2 rounded-md;
  }
  li a:hover {
    background-color: color-mix(in srgb, currentColor 8%, transparent);
  }
  .snippet {
    @apply text-xs opacity-60 mt-1 line-clamp-2;
  }
}
</style>
