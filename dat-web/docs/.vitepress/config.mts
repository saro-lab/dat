import { defineConfig } from 'vitepress'
import tailwindcss from "@tailwindcss/vite";
// @ts-ignore
import markdown from "markdown-it-include/index.js";
import path from "node:path";

import { DEFAULT_LOCALE, localeCodes, messages, vitepressLocales } from "./locales";

const SITE_HOST = 'https://dat.saro.me'
const LOCALES: string[] = localeCodes

const MUSTACHE_T = /\{\{\s*t\(\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g

function resolveTitle(title: string, locale: string): string {
  return title.replace(MUSTACHE_T, (raw, key: string) => {
    const dict = messages[(locale || DEFAULT_LOCALE) as keyof typeof messages] as Record<string, string>
    const fallback = messages[DEFAULT_LOCALE] as Record<string, string>
    return dict?.[key] || fallback[key] || raw
  })
}

const FONT_ICONS =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0,0&display=block'
const FONT_TEXT = 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400..700&display=swap'

// @ts-ignore
export default defineConfig({
  title: "DAT",
  titleTemplate: ':title | DAT',
  description: "DAT (Distributed Access Token) — A fixed five-field token specification with mandatory expiration, encrypted payloads, signatures, and certificate-based key rotation.",
  head: [
    ['script', { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-N4K2L7KWJ9' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },],
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
    ['meta', { property: 'og:image', content: `${SITE_HOST}/og.png` }],
    ['meta', { property: 'og:image:type', content: 'image/png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'DAT — Distributed Access Token' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${SITE_HOST}/og.png` }],
  ],
  // /llms/*.md are static files under public/, not pages.
  // /llms/*.md 는 페이지가 아니라 public/ 아래의 정적 파일이다.
  ignoreDeadLinks: [/^\/llms\//],
  sitemap: {
    hostname: SITE_HOST,
    transformItems: (items) => items.filter((item) => item.url !== '404'),
  },
  transformPageData(pageData) {
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
      'description': desc || 'DAT (Distributed Access Token) — A fixed five-field token specification with mandatory expiration, encrypted payloads, signatures, and certificate-based key rotation.',
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
      // A narrow viewport must scroll the table, not squeeze its columns.
      // 화면이 좁아지면 표를 찌그러뜨리지 말고 가로로 스크롤해야 한다.
      md.renderer.rules.table_open = () => '<div class="table-scroll"><table>\n'
      md.renderer.rules.table_close = () => '</table></div>\n'
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
