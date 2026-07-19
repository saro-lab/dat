import { defineConfig } from 'vitepress'
import tailwindcss from "@tailwindcss/vite";
// @ts-ignore
import markdown from "markdown-it-include/index.js";
import path from "node:path";

import { DEFAULT_LOCALE, localeCodes, vitepressLocales } from "./locales";

const SITE_HOST = 'https://dat.saro.me'
const LOCALES: string[] = localeCodes

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
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block' },],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Noto+Sans:wght@100..900&family=Noto+Serif:wght@100..900&display=swap' },],
    ['meta', { name: "viewport", content: "width=device-width,user-scalable=no,initial-scale=1" }],
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
