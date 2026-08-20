import { computed, type ComputedRef } from 'vue'
import { useData } from 'vitepress'
import type { MessageKey } from '../locales'

export type NavLink = {
  path: string
  titleKey?: MessageKey
  title?: string
  navKey?: MessageKey
  sub?: boolean
  locales?: string[]
  icon?: string
}

export type NavExternal = {
  external: string
  title?: string
  titleKey?: MessageKey
  icon?: string
}

export type NavGroup = { labelKey: MessageKey }

export type NavEntry = NavLink | NavExternal | NavGroup

export type NavSection = {
  titleKey: MessageKey
  entries: NavEntry[]
  flat?: boolean
}

export function isGroup(entry: NavEntry): entry is NavGroup {
  return 'labelKey' in entry
}

export function isExternal(entry: NavEntry): entry is NavExternal {
  return 'external' in entry
}

export function isLink(entry: NavEntry): entry is NavLink {
  return !isGroup(entry) && !isExternal(entry)
}

export function inLocale(entry: NavEntry, locale: string): boolean {
  return !isLink(entry) || !entry.locales || entry.locales.includes(locale)
}

export function useNavSections(): ComputedRef<NavSection[]> {
  const locale = useLocale()
  return computed(() =>
    navSections
      .map((section) => ({
        ...section,
        entries: section.entries.filter((entry) => inLocale(entry, locale.value)),
      }))
      .filter((section) => section.entries.some((entry) => !isGroup(entry))),
  )
}

export function usePageOrder(): ComputedRef<NavLink[]> {
  const locale = useLocale()
  return computed(() => pageOrder.filter((entry) => inLocale(entry, locale.value)))
}

function useLocale(): ComputedRef<string> {
  const { localeIndex } = useData()
  return computed(() => (localeIndex.value === 'root' ? '' : localeIndex.value))
}

export const navSections: NavSection[] = [
  {
    titleKey: 'menu_intro',
    entries: [{ path: '/intro', titleKey: 'menu_intro_index' }],
  },
  {
    titleKey: 'menu_spec',
    entries: [
      { path: '/spec/dat', titleKey: 'menu_spec_dat' },
      { path: '/spec/dat-certificate', titleKey: 'menu_spec_cert' },
      { path: '/spec/cms', titleKey: 'menu_spec_cms' },
      { path: '/spec/errors', titleKey: 'menu_spec_errors' },
    ],
  },
  {
    titleKey: 'menu_libs',
    entries: [
      { path: '/libs/', titleKey: 'menu_libs_index' },
      { path: '/libs/cargo-dat', title: 'Rust' },
      { path: '/libs/maven-me.saro-dat', title: 'Java' },
      { path: '/libs/npm-saro-dat', title: 'Javascript' },
      { path: '/libs/pypi-saro-dat', title: 'Python' },
      { path: '/libs/nuget-saro-dat', title: 'C#' },
      { path: '/libs/go-saro-dat', title: 'Go' },
      { path: '/libs/gems-saro-dat', title: 'Ruby' },
      { path: '/libs/vcpkg-dat', title: 'C/C++' },
    ],
  },
  {
    titleKey: 'menu_svc',
    entries: [{ path: '/svc/docker-saro-lab-dat-cms', titleKey: 'menu_svc_cms' }],
  },
  {
    titleKey: 'menu_tool',
    entries: [
      { path: '/tool/bytes', titleKey: 'menu_tool_bytes' },
      { external: 'https://lab.saro.me/tool/infinite-unixtime', titleKey: 'menu_tool_time' },
    ],
  },
  {
    titleKey: 'menu_projects',
    flat: true,
    entries: [
      { external: 'https://lab.saro.me/', title: 'SARO Lab', icon: '/logo/saro-lab.svg' },
      { external: 'https://ticketing.saro.me/', title: 'Ticketing', icon: '/logo/ticketing.svg' },
      { external: 'https://nabi.saro.me/', title: 'NABI NOTE', icon: '/logo/nabi-note.svg' },
    ],
  },
]

export const pageOrder: NavLink[] = navSections.flatMap(
  (section) => section.entries.filter(isLink) as NavLink[],
)

export function useCurrentPath(): ComputedRef<string> {
  const { page } = useData()
  return computed(() => {
    const [, ...rest] = page.value.relativePath.replace(/\.md$/, '').split('/')
    const path = `/${rest.join('/')}`
    return path.endsWith('/index') ? path.slice(0, -'index'.length) : path
  })
}
