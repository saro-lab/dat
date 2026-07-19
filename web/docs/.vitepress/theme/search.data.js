import { createContentLoader } from 'vitepress'

// Build-time search index: one entry per markdown page, with tags stripped so
// MiniSearch works on plain text. Consumed by ui/Search.vue.
export default createContentLoader('**/*.md', {
  includeSrc: false,
  render: true,
  transform(raw) {
    return raw.map(({ url, frontmatter, html }) => {
      const text = html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || ''
      const firstHeading = html?.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim()
      return {
        id: url,
        title: frontmatter.title || firstHeading || 'DAT',
        text,
      }
    })
  },
})
