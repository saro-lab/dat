import { useData } from 'vitepress'
import { computed, type ComputedRef } from 'vue'
import {
  DEFAULT_LOCALE,
  localeCodes,
  localeNames,
  messages,
  type LocaleCode,
  type MessageKey,
} from '../locales'

/** Language code → native display name, e.g. `{ ko: '한국어', ... }`. */
export const languageList = localeNames

/** All supported language codes. */
export const languageCodeList = localeCodes

function isLocaleCode(code: string): code is LocaleCode {
  return (localeCodes as string[]).includes(code)
}

/** The language list in a random order — used to rotate the switcher menu. */
export function languageRandom(): [string, string][] {
  return [...Object.entries(localeNames)].sort(() => Math.random() - 0.5)
}

/** The current locale's path prefix, e.g. `/ko` — empty string at the site root. */
export function useRoot(): ComputedRef<string> {
  const { localeIndex } = useData()
  return computed(() => `/${localeIndex.value}`.replace(/^\/root/, ''))
}

function readCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

function writeCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

function getDefaultLanguage(): LocaleCode {
  const saved = readCookie('lang')
  if (isLocaleCode(saved)) {
    return saved
  }
  for (const full of navigator.languages) {
    const code = full.split('-')[0]
    if (isLocaleCode(code)) {
      return code
    }
  }
  return DEFAULT_LOCALE
}

/** The language code embedded in the current URL path, or `''` at root. */
export function getLanguage(): string {
  const code = location?.pathname?.split('/')?.[1] || ''
  return isLocaleCode(code) ? code : ''
}

/**
 * Sends the visitor to the language-prefixed twin of the current path, picking
 * the language from `force`, then the saved cookie, then the browser's own
 * preference list. Returns whether a navigation was actually started, so the
 * layout can hold off painting a page that is about to be replaced.
 */
export function applyLanguage(force: string = ''): boolean {
  let path = location.pathname

  // Legacy paths were prefixed with `/--/` — strip it.
  if (path.startsWith('/--/')) {
    path = path.slice('/--'.length)
  }

  /* The locale is split off as a whole path segment. Matching on `/ko/` instead
     left the prefix in place for a bare `/ko`, and re-prefixing produced
     `/ko/ko` — a redirect into a genuine 404. */
  const [, first = '', ...rest] = path.split('/')
  let lang = isLocaleCode(first) ? first : ''
  if (lang) {
    path = `/${rest.join('/')}`
  }

  if (force) {
    lang = force
  }
  if (!lang) {
    lang = getDefaultLanguage()
  }

  const target = `/${lang}${path}`
  writeCookie('lang', lang)

  if (location.pathname === target) {
    return false
  }

  const url = target + location.search + location.hash
  /* An automatic redirect replaces the entry it came from, so Back does not
     land on the un-prefixed path and bounce forward again. An explicit switch
     from the language menu is a real navigation and keeps its history entry. */
  if (force) {
    location.assign(url)
  } else {
    location.replace(url)
  }
  return true
}

function t(lang: string, key: string): string {
  const dict = (isLocaleCode(lang) ? messages[lang] : messages[DEFAULT_LOCALE]) as Record<string, string>
  const fallback = messages[DEFAULT_LOCALE] as Record<string, string>
  return dict[key] || fallback[key] || key
}

export function useTranslate(): { t: (key: MessageKey | string) => string } {
  const { lang } = useData()
  return {
    t: (key: MessageKey | string) => t(lang.value, key as string),
  }
}
