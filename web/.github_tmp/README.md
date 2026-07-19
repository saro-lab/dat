# GitHub workflows (staging)

These workflow files are staged here because the current environment does not
have write permission to `.github/`. To activate CI/CD, move this directory's
contents into `.github/`:

```sh
mkdir -p .github/workflows
mv .github_tmp/workflows/* .github/workflows/
rmdir .github_tmp/workflows .github_tmp
```

## Workflows

Both workflows use npm (`npm ci`), matching the committed `package-lock.json`.

- **ci.yml** — builds the site on every pull request and non-`master` push, to
  catch build failures before merge.
- **deploy.yml** — builds and deploys to Cloudflare Workers on every push to
  `master` (and via manual dispatch).

## Required repository secrets (for deploy.yml)

Set these under **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` — a Cloudflare API token with the *Workers Scripts:
  Edit* permission.
- `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID.
