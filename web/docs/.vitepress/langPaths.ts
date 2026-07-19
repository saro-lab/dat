import { localeCodes } from './locales'

/**
 * Shared dynamic-route definition for every `[lang]` page. Each `*.paths.js`
 * beside a `[lang]` markdown file re-exports this, so the set of generated
 * language routes always matches the locale registry.
 */
export default {
  paths: () => localeCodes.map((lang) => ({ params: { lang } })),
}
