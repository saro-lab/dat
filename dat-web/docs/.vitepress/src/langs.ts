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

export const languageList = localeNames

export const languageCodeList = localeCodes

function isLocaleCode(code: string): code is LocaleCode {
  return (localeCodes as string[]).includes(code)
}

export function languageRandom(): [string, string][] {
  return [...Object.entries(localeNames)].sort(() => Math.random() - 0.5)
}

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

export function getLanguage(): string {
  const code = location?.pathname?.split('/')?.[1] || ''
  return isLocaleCode(code) ? code : ''
}

export function applyLanguage(force: string = ''): boolean {
  let path = location.pathname

  if (path.startsWith('/--/')) {
    path = path.slice('/--'.length)
  }

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
