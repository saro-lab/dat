<template>
  <nav class="g-menu" :class="{ 'g-menu-on': onMenu }">
    <div class="g-menu-backdrop" @click="onMenu = false"></div>

    <div class="g-glass md rd-box g-menu-panel">
      <div translate="no" class="material-symbols-outlined g-menu-close g-link-hover" @click="onMenu = false">close</div>

      <div class="menu-sections">
        <section v-for="section in navSections" :key="section.titleKey" class="menu-section">
          <div class="menu-title">{{ t(section.titleKey) }}</div>
          <div>
            <template v-for="entry in section.entries">
              <div v-if="isGroup(entry)" :key="entry.labelKey" class="menu-group">
                {{ t(entry.labelKey) }}
              </div>
              <div v-else :key="entry.path" class="menu-row" :class="{ sub: entry.sub }">
                <a
                  :href="`${root}${entry.path}`"
                  class="menu-item"
                  :class="{ on: entry.path === currentPath }"
                  :aria-current="entry.path === currentPath ? 'page' : undefined"
                >
                  {{ entry.title || t(entry.titleKey!) }}
                </a>
              </div>
            </template>
          </div>
        </section>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { isGroup, useCurrentPath, useNavSections } from '../src/nav'
import { useRoot, useTranslate } from '../src/langs'

const onMenu = defineModel({
  type: Boolean,
  required: true,
})

const { t } = useTranslate()
const root = useRoot()
const navSections = useNavSections()
const currentPath = useCurrentPath()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    onMenu.value = false
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
@reference 'tailwindcss';

.g-menu {
    /* 섹션 라벨 : 본문 위계와 섞이지 않도록 작고 넓은 자간의 중립색 캡션으로 둔다 */
    .menu-title {
        @apply px-2 mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.09em];
        color: var(--c-muted);
    }
    .menu-group {
        @apply px-2 mt-3 mb-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.06em];
        color: color-mix(in srgb, var(--c-text-1) 50%, transparent);
    }
    .menu-item {
        @apply block px-2 py-[0.3rem] rounded-md text-[0.84rem] font-medium transition-colors duration-150;
        color: var(--c-text-2);
        text-decoration: none;

        &:hover {
            color: var(--c-text-1);
            background-color: color-mix(in srgb, currentColor 8%, transparent);
            text-decoration: none;
        }
    }
    /* 현재 문서 : 색·굵기·면을 함께 바꿔 스캔할 때 한눈에 잡히게 */
    .menu-item.on {
        @apply font-semibold;
        color: var(--c-link-1);
        background-color: color-mix(in srgb, var(--c-link-1) 12%, transparent);
    }
    /* 하위 항목은 들여쓰기 대신 세로 가이드 레일로 묶는다 (행이 붙어 있어 선이 이어진다) */
    .menu-row.sub {
        @apply ml-2 pl-1.5;
        border-left: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    }

    /* ── desktop: fixed left sidebar ─────────────────────────────────── */
    @variant min-[60rem] {
        /* Capped as well as floored: as a flex item the sidebar would otherwise
           size to its longest label on a single line, and languages with long
           compound terms (pt, es, fr, ru) pushed it far past the width the
           layout allows, squeezing the article. Past the cap, labels wrap. */
        @apply min-w-[13rem] max-w-[16rem];

        .g-menu-backdrop,
        .g-menu-close {
            @apply hidden;
        }
        .menu-section + .menu-section {
            @apply mt-4 pt-4;
            border-top: var(--divider);
        }
    }

    /* ── small screens: centered sitemap modal ───────────────────────── */
    @variant max-[60rem] {
        &:not(.g-menu-on) {
            @apply hidden;
        }
        @apply fixed inset-0 z-70 flex items-start justify-center pt-[9vh] px-4;

        .g-menu-backdrop {
            @apply absolute inset-0;
            background-color: rgba(0, 0, 0, 0.35);
            backdrop-filter: blur(2px);
            animation: g-menu-fade 0.18s ease-out;
        }
        .g-menu-panel {
            @apply relative m-0! w-full max-w-[36rem] max-h-[78vh] overflow-y-auto
                border! rounded-xl! backdrop-blur-xl;
            animation: g-menu-pop 0.18s ease-out;
        }
        .g-menu-close {
            @apply sticky top-0 float-right -mr-1 cursor-pointer text-2xl;
            color: var(--c-text-2);
        }

        .menu-sections {
            @apply grid grid-cols-2 gap-x-6 gap-y-5;
        }
        .menu-item {
            @apply py-1.5 text-[0.86rem];
        }
    }
    @variant max-[40rem] {
        .menu-sections {
            @apply grid-cols-1 gap-y-4;
        }
        .menu-section + .menu-section {
            @apply pt-4;
            border-top: var(--divider);
        }
        .menu-item {
            @apply text-[0.92rem];
        }
    }
}

@keyframes g-menu-pop {
    from {
        opacity: 0;
        transform: translateY(6px) scale(0.98);
    }
}
@keyframes g-menu-fade {
    from {
        opacity: 0;
    }
}
@media (prefers-reduced-motion: reduce) {
    .g-menu .g-menu-panel,
    .g-menu .g-menu-backdrop {
        animation: none;
    }
}
</style>
