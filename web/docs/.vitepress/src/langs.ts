import { useData } from 'vitepress'
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

async function getDefaultLanguage(): Promise<LocaleCode> {
  const saved = (await cookieStore.get('lang'))?.value || ''
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

export async function applyLanguage(force: string = '') {
  let path = location?.pathname

  // Legacy paths were prefixed with `/--/` — strip it.
  if (path.startsWith('/--/')) {
    path = path.replace('/--/', '/')
  }

  let lang = getLanguage()
  if (lang) {
    path = path.replace(`/${lang}/`, `/`)
  }
  if (force) {
    lang = force
  }
  if (!lang) {
    lang = await getDefaultLanguage()
  }

  path = `/${lang}${path}`
  await cookieStore.set('lang', lang)

  if (location?.pathname != path) {
    location.href = path + location.search
  }
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
