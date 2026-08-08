import { computed, type ComputedRef } from 'vue'
import { useData } from 'vitepress'
import type { MessageKey } from '../locales'

/** A documentation page: one sidebar entry and one stop in the reading order. */
export type NavLink = {
  /** Locale-agnostic path, e.g. `/spec/dat`. */
  path: string
  /** Locale key for the sidebar label. */
  titleKey?: MessageKey
  /** Proper noun that needs no translation (e.g. `Go`), used as-is. */
  title?: string
  /** Locale key for the prev/next label, when it differs from the sidebar label. */
  navKey?: MessageKey
  /** Renders indented under the preceding group heading. */
  sub?: boolean
  /**
   * Locale codes this page exists in. Omit once every locale has it — the menu
   * is shared across all 15 languages, so listing a page that only some of them
   * carry would hand the rest a link straight into the 404.
   */
  locales?: string[]
  /** Icon shown left of the label, e.g. `/logo/dat.svg`. */
  icon?: string
}

/** A page on a sibling site: leaves the docs, so it has no place in the reading order. */
export type NavExternal = {
  /**
   * Full target URL, always un-prefixed by a locale. Our 15 languages are not
   * everyone's 15, and a locale the target does not carry is a 404 — its own
   * entry point sends the reader to the right language.
   */
  external: string
  /** Proper noun shown as-is, e.g. `SARO Lab`. */
  title?: string
  titleKey?: MessageKey
  icon?: string
}

/** A non-clickable heading that groups the links after it. */
export type NavGroup = { labelKey: MessageKey }

export type NavEntry = NavLink | NavExternal | NavGroup

export type NavSection = {
  titleKey: MessageKey
  entries: NavEntry[]
}

export function isGroup(entry: NavEntry): entry is NavGroup {
  return 'labelKey' in entry
}

export function isExternal(entry: NavEntry): entry is NavExternal {
  return 'external' in entry
}

/** A page of this site — the only kind of entry that has a path to compare against. */
export function isLink(entry: NavEntry): entry is NavLink {
  return !isGroup(entry) && !isExternal(entry)
}

/** Whether this entry should show up in the given locale. */
export function inLocale(entry: NavEntry, locale: string): boolean {
  return !isLink(entry) || !entry.locales || entry.locales.includes(locale)
}

/** `navSections` with entries the current locale does not carry filtered out. */
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

/** Reading order for the current locale, so prev/next never points at a 404. */
export function usePageOrder(): ComputedRef<NavLink[]> {
  const locale = useLocale()
  return computed(() => pageOrder.filter((entry) => inLocale(entry, locale.value)))
}

/** The current locale code, e.g. `ko`. Empty at the un-prefixed site root. */
function useLocale(): ComputedRef<string> {
  const { localeIndex } = useData()
  return computed(() => (localeIndex.value === 'root' ? '' : localeIndex.value))
}

/**
 * The single source of truth for site navigation: the sidebar (`ui/Menu.vue`)
 * renders these sections, and the previous/next document nav (`ui/PageNav.vue`)
 * walks the flattened `pageOrder` below. The home page is intentionally absent —
 * it is a landing page, not part of the doc flow.
 */
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
      { path: '/libs/cargo-dat', title: 'Rust (cargo)' },
      { path: '/libs/maven-me.saro-dat', title: 'Java (maven)' },
      { path: '/libs/npm-saro-dat', title: 'Javascript (npm)' },
      { path: '/libs/pypi-saro-dat', title: 'Python (pypi)' },
      { path: '/libs/nuget-saro-dat', title: 'C# (nuget)' },
      { path: '/libs/go-saro-dat', title: 'Go' },
      { path: '/libs/gems-saro-dat', title: 'Ruby (gems)' },
      { path: '/libs/vcpkg-dat', title: 'C/C++ (vcpkg)' },
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
      /* The converter itself now lives in SARO Lab; the page here is on its way out. */
      { external: 'https://lab.saro.me/tool/infinite-unixtime', titleKey: 'menu_tool_time' },
    ],
  },
  /* Sibling sites, kept last: this is where a reader leaves for the rest of
     SARO Lab, so it sits below everything this site itself can answer. */
  {
    titleKey: 'menu_projects',
    entries: [
      { external: 'https://lab.saro.me/', title: 'SARO Lab', icon: '/logo/saro-lab.svg' },
      { external: 'https://ticketing.saro.me/', title: 'Ticketing', icon: '/logo/ticketing.svg' },
      { external: 'https://nabi.saro.me/', title: 'NABI NOTE', icon: '/logo/nabi-note.svg' },
    ],
  },
]

/** Every page in reading order, flattened out of `navSections`. */
export const pageOrder: NavLink[] = navSections.flatMap(
  (section) => section.entries.filter(isLink) as NavLink[],
)

/**
 * The page being read as a locale-agnostic nav path, e.g. `ko/libs/index.md` →
 * `/libs/`, so it can be compared against a `NavLink.path` directly. The first
 * segment is dropped whether it is a real locale (`ko/…`) or the literal
 * `[lang]/…` of a dynamic route, so both kinds of page resolve the same way.
 */
export function useCurrentPath(): ComputedRef<string> {
  const { page } = useData()
  return computed(() => {
    const [, ...rest] = page.value.relativePath.replace(/\.md$/, '').split('/')
    const path = `/${rest.join('/')}`
    return path.endsWith('/index') ? path.slice(0, -'index'.length) : path
  })
}
