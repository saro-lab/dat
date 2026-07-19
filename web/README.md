
# DAT — Distributed Access Token

The documentation site for **DAT (Distributed Access Token)**, a lightweight,
high-performance token specification with enforced security and mandatory key
rolling — a faster, safer alternative to JWT.

Built with [VitePress](https://vitepress.dev/) and deployed to Cloudflare
Workers. Available in 14 languages.

- **Live site:** https://dat.saro.me

## Requirements

- [Node.js](https://nodejs.org/) 20+
- npm (bundled with Node.js)

## Development

```sh
npm install
npm run dev           # start the dev server (http://localhost:5173)
```

## Build & preview

```sh
npm run docs:build    # build the static site into docs/.vitepress/dist
npm run docs:preview  # preview the built site
npm run preview       # build, then serve through Wrangler (Cloudflare runtime)
```

## Deploy

```sh
npm run deploy        # build, then deploy to Cloudflare with Wrangler
```

CI/CD workflows for GitHub Actions are staged in [`.github_tmp/`](./.github_tmp)
— see its README to activate them.

## Project structure

```
docs/
  index.md              Root landing page (redirects to a locale)
  <locale>/             Static pages per language (index, intro, spec/*)
  [lang]/               Shared pages rendered once per language (libs, svc, tool)
  public/               Static assets (favicon, robots.txt, llms.txt, og image)
  .vitepress/
    config.mts          VitePress site config
    locales/            Translation dictionaries — the single source of truth
                        for the language list (add a language here and nowhere
                        else); index.ts derives every derived list
    langPaths.ts        Shared dynamic-route definition for [lang] pages
    src/                Shared TypeScript helpers (i18n, libraries, utilities)
    ui/                 Vue components used inside markdown pages
    theme/              Custom VitePress theme (Layout, styles, search index)
```

## Adding a language

1. Create `docs/.vitepress/locales/<code>.ts` (copy `en.ts` and translate).
2. Register it in `docs/.vitepress/locales/index.ts` `messages` map.
3. Add the per-language content directory (`docs/<code>/`).

The config, language switcher, translation helper, and generated `[lang]`
routes all read from the registry, so no other file needs to change.
