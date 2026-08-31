import { enGuideLocale } from './en'
import { arGuideLocale } from './ar'
import { bnGuideLocale } from './bn'
import { deGuideLocale } from './de'
import { esGuideLocale } from './es'
import { frGuideLocale } from './fr'
import { hiGuideLocale } from './hi'
import { idGuideLocale } from './id'
import { jaGuideLocale } from './ja'
import { ptGuideLocale } from './pt'
import { ruGuideLocale } from './ru'
import { urGuideLocale } from './ur'
import { zhGuideLocale } from './zh'
import type { SharedGuideLocale } from './types'

const guideLocales: Partial<Record<string, SharedGuideLocale>> = {
  en: enGuideLocale,
  ja: jaGuideLocale,
  zh: zhGuideLocale,
  de: deGuideLocale,
  fr: frGuideLocale,
  es: esGuideLocale,
  ar: arGuideLocale,
  id: idGuideLocale,
  pt: ptGuideLocale,
  hi: hiGuideLocale,
  ru: ruGuideLocale,
  bn: bnGuideLocale,
  ur: urGuideLocale,
}

export function getGuideLocale(locale: string): SharedGuideLocale {
  return guideLocales[locale] ?? enGuideLocale
}
