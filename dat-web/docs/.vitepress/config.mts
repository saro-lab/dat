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
    /* SVG를 먼저 두되 PNG를 남겨 둔다 — SVG 파비콘을 못 읽는 클라이언트(구형 사파리,
       대부분의 RSS·채팅 프리뷰 봇)가 폴백으로 집어 갈 게 있어야 한다. 16/32는 링을
       키운 별도 소스(origin/ci/mark-small.svg)에서 뽑아서 그 크기에서 뭉개지지 않는다. */
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },],
    /* 홈 화면 아이콘은 모서리를 OS가 깎으므로 라운드 없는 풀블리드를 준다. */
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },],
    ['link', { rel: 'manifest', href: '/site.webmanifest' },],
    ['meta', { name: 'theme-color', content: '#0b2b28' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' },],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: "" },],
    ['link', { rel: 'stylesheet', href: FONT_ICONS },],
    ['link', { rel: 'stylesheet', href: FONT_TEXT },],
    ['meta', { name: "viewport", content: "width=device-width,initial-scale=1" }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'DAT' }],
    /* OG는 PNG여야 한다 — 슬랙·디스코드·트위터 카드 렌더러는 SVG를 대부분 무시하고
       썸네일을 아예 그리지 않는다. 크기를 같이 넘기면 이미지를 받기 전에 자리를
       잡아 카드가 밀리지 않는다. 1200×630이라 카드는 large 형식으로 뜬다. */
    ['meta', { property: 'og:image', content: `${SITE_HOST}/og.png` }],
    ['meta', { property: 'og:image:type', content: 'image/png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'DAT — Distributed Access Token' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${SITE_HOST}/og.png` }],
  ],
  sitemap: {
    hostname: SITE_HOST,
    /* docs/404.md는 탭 제목을 중립으로 두려고 둔 껍데기일 뿐 색인 대상이 아니다. */
    transformItems: (items) => items.filter((item) => item.url !== '404'),
  },
  transformPageData(pageData) {
    /* 404.html은 진짜 없는 페이지 말고도, 로케일 접두사가 없는 경로가 잠깐 거쳐 가는
       착륙 지점이다. 제목을 '404'로 두면 그 찰나에 탭 제목이 "404 | DAT"로 번쩍인다.
       어차피 마운트 후 'DAT'로 덮어쓰므로 정적 제목도 처음부터 중립으로 둔다. */
    if (pageData.relativePath === '404.md') {
      pageData.title = 'DAT'
      pageData.titleTemplate = false
    }

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
