import { defineConfig } from 'vitepress'
import tailwindcss from "@tailwindcss/vite";
// @ts-ignore
import markdown from "markdown-it-include/index.js";
import path from "node:path";

import { DEFAULT_LOCALE, localeCodes, messages, vitepressLocales } from "./locales";

const SITE_HOST = 'https://dat.saro.me'
const LOCALES: string[] = localeCodes

/* VitePress는 마크다운 H1에서 pageData.title을 뽑는데, 그건 Vue가 보간하기 전이라
   `# {{t('menu_libs_index')}}` 같은 제목은 mustache 원문 그대로 <title>·og:title·
   JSON-LD에 실려 나간다. 본문은 Vue가 제대로 그리므로, 여기서 같은 사전을 찾아
   빌드 시점에만 풀어 준다. */
const MUSTACHE_T = /\{\{\s*t\(\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g

function resolveTitle(title: string, locale: string): string {
  return title.replace(MUSTACHE_T, (raw, key: string) => {
    const dict = messages[(locale || DEFAULT_LOCALE) as keyof typeof messages] as Record<string, string>
    const fallback = messages[DEFAULT_LOCALE] as Record<string, string>
    return dict?.[key] || fallback[key] || raw
  })
}

/* 아이콘은 FILL/GRAD를 가변축으로 두지 않고 0,0에 고정한다 — 쓰는 축이 하나뿐인데
   가변 폰트 전체를 받아 올 이유가 없다. 본문도 Noto Sans 하나로 통일했고(400..700),
   이모지는 시스템 폰트(Apple/Segoe/Noto Color Emoji)에 맡겨 웹폰트를 받지 않는다. */
const FONT_ICONS =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0,0&display=block'
const FONT_TEXT = 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400..700&display=swap'

// https://vitepress.dev/reference/site-config
// @ts-ignore
export default defineConfig({
  title: "DAT",
  titleTemplate: ':title | DAT',
  description: "DAT (Distributed Access Token) — A lightweight, high-performance token specification with enforced security and mandatory key rolling. A faster, safer alternative to JWT.",
  head: [
    ['script', { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-N4K2L7KWJ9' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/dat.svg' },],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' },],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: "" },],
    ['link', { rel: 'stylesheet', href: FONT_ICONS },],
    ['link', { rel: 'stylesheet', href: FONT_TEXT },],
    ['meta', { name: "viewport", content: "width=device-width,initial-scale=1" }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'DAT' }],
    ['meta', { property: 'og:image', content: `${SITE_HOST}/og.svg` }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:image', content: `${SITE_HOST}/og.svg` }],
  ],
  sitemap: {
    hostname: SITE_HOST,
  },
  transformPageData(pageData) {
    const relativePath = pageData.relativePath.replace(/\.md$/, '')
    const parts = relativePath.split('/')
    const firstPart = parts[0]
    const pathParts = parts.slice(1)

    let locale = ''
    if (LOCALES.includes(firstPart)) {
      locale = firstPart
    } else if (firstPart === '[lang]') {
      const langParam = (pageData.params as any)?.lang
      if (typeof langParam === 'string' && LOCALES.includes(langParam)) {
        locale = langParam
      }
    }

    if (pageData.title) {
      pageData.title = resolveTitle(pageData.title, locale)
    }

    pageData.frontmatter.head ??= []

    if (locale) {
      const cleanPath = pathParts.length > 0 ? '/' + pathParts.join('/') : ''
      const pageUrl = `${SITE_HOST}/${locale}${cleanPath}`

      pageData.frontmatter.head.push(
        ['link', { rel: 'canonical', href: pageUrl }],
        ['meta', { property: 'og:url', content: pageUrl }],
      )
      for (const loc of LOCALES) {
        pageData.frontmatter.head.push(
          ['link', { rel: 'alternate', hreflang: loc, href: `${SITE_HOST}/${loc}${cleanPath}` }]
        )
      }
      pageData.frontmatter.head.push(
        ['link', { rel: 'alternate', hreflang: 'x-default', href: `${SITE_HOST}/${DEFAULT_LOCALE}${cleanPath}` }]
      )
    }

    const title = pageData.title
    const desc = pageData.description
    if (title) {
      pageData.frontmatter.head.push(
        ['meta', { property: 'og:title', content: `${title} | DAT` }],
        ['meta', { name: 'twitter:title', content: `${title} | DAT` }],
      )
    }
    if (desc) {
      pageData.frontmatter.head.push(
        ['meta', { property: 'og:description', content: desc }],
        ['meta', { name: 'twitter:description', content: desc }],
      )
    }

    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': locale ? 'TechArticle' : 'WebSite',
      'name': title ? `${title} | DAT` : 'DAT - Distributed Access Token',
      'url': locale ? `${SITE_HOST}/${locale}${pathParts.length > 0 ? '/' + pathParts.join('/') : ''}` : SITE_HOST,
      'description': desc || 'DAT (Distributed Access Token) — A lightweight, high-performance token specification with enforced security and mandatory key rolling.',
      'inLanguage': locale || DEFAULT_LOCALE,
      'publisher': { '@type': 'Organization', 'name': 'DAT', 'url': SITE_HOST },
    })
    pageData.frontmatter.head.push(['script', { type: 'application/ld+json' }, jsonLd])
  },
  markdown: {
    config: (md) => {
      md.use(markdown, {
        root: path.resolve(__dirname, '@')
      })
    },
  },
  locales: vitepressLocales,
  appearance: true,
  vite: {
    plugins: [
      // @ts-ignore
      tailwindcss(),
    ],
    resolve: {
      alias: {
        util: 'util',
      }
    },
    build: {
      target: 'esnext'
    }
  },
  cleanUrls: true
})
