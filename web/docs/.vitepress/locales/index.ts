import { ar } from './ar'
import { bn } from './bn'
import { de } from './de'
import { en } from './en'
import { es } from './es'
import { fr } from './fr'
import { hi } from './hi'
import { id } from './id'
import { ja } from './ja'
import { ko } from './ko'
import { pt } from './pt'
import { ru } from './ru'
import { ur } from './ur'
import { zh } from './zh'

/**
 * The single source of truth for every language on the site.
 *
 * Add a new language by importing its dictionary above and adding one entry
 * here — the VitePress locale config, the language switcher, the translation
 * helper, and every derived list below all read from this map, so no other
 * file needs to change.
 */
export const messages = { en, ko, ja, zh, de, fr, es, ar, id, pt, hi, ru, bn, ur }

export type LocaleCode = keyof typeof messages
export type Messages = typeof en
export type MessageKey = keyof Messages

/** Every supported language code, e.g. `['en', 'ko', 'ja', ...]`. */
export const localeCodes = Object.keys(messages) as LocaleCode[]

/** Language code → its native display name (e.g. `ko` → `한국어`). */
export const localeNames = Object.fromEntries(
  localeCodes.map((code) => [code, messages[code].label]),
) as Record<LocaleCode, string>

/** English is the default and is served both at `/` (root) and `/en/`. */
export const DEFAULT_LOCALE: LocaleCode = 'en'

/** VitePress `locales` config: the default at root plus one entry per language. */
export const vitepressLocales = {
  root: messages[DEFAULT_LOCALE],
  ...messages,
}
