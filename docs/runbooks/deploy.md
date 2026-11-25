# Deploy runbook

The Site (`apps/site`, worker `site`), the Docs Portal (`apps/docs`, worker `docs`), the blog
(`apps/blog`, worker `blog`) and the data Worker (`apps/data`, worker `data`) deploy to Cloudflare
Workers from this repository's CI: `.github/workflows/deploy.yml`. Cloudflare's own Git integration
(Workers Builds) is not used, so the whole deploy is configured and reviewed here.
`trajectonomics-web-router` routes trajectonomics.com to the workers by name, so a deploy changes
nothing in the router.

## How deploys happen

- **Off until switched on.** Nothing runs while the repository variable `DEPLOYS_ENABLED` is not
  `true`.
- **Push to main.** Each app deploys when its folder changed, or a shared input did:
  `packages/brand`, `tooling/config`, `bun.lock`, the root `package.json` or `turbo.json`.
- **By hand.** From main, deploy one app or all of them:
  ```sh
  gh workflow run deploy.yml --ref main -f app=all    # or site, docs, blog, data
  ```
- **Build.** `bunx turbo run build --filter=@trajectonomics/<app>`, which builds `packages/brand`
  first (every app imports its `dist/current/`), then `bunx wrangler deploy` in the app folder.
- **Roll back.** Revert the commit on main (a new deploy follows), or in the Cloudflare dashboard
  open the worker → **Deployments** and roll back to an earlier version.

## One-time setup

1. **API token (owner, Cloudflare dashboard).** **My Profile → API Tokens → Create Token →** the
   **Edit Cloudflare Workers** template. Under **Account Resources**, pick only the Trajectonomics
   account; under **Zone Resources**, only `trajectonomics.com`. Create it, and copy it once.
2. **Secrets and the switch.** Store the token and the account ID, then switch deploys on:
   ```sh
   gh secret set CLOUDFLARE_API_TOKEN -R trajectonomics/trajectonomics       # paste the token
   gh secret set CLOUDFLARE_ACCOUNT_ID -R trajectonomics/trajectonomics      # the account ID
   gh variable set DEPLOYS_ENABLED --body true -R trajectonomics/trajectonomics
   ```
   The account ID is on the dashboard's **Workers & Pages** overview, or comes from
   `curl -s -H "Authorization: Bearer $TOKEN" https://api.cloudflare.com/client/v4/accounts`.
3. **First deploy.** `gh workflow run deploy.yml --ref main -f app=all`, then open
   trajectonomics.com and docs.trajectonomics.com. `/contribute/tax/` exists only in builds from
   this repository, so it answering 200 proves the new deploy is live. `trajectonomics.com/docs/contribute/tax/`
   should answer 301 to that page. The docs Worker attaches `docs.trajectonomics.com` as a custom domain
   on deploy. That creates the DNS record, so the hostname must not already be a CNAME, and the API
   token needs permission to attach a custom domain on the `trajectonomics.com` zone. The router keeps
   forwarding `/docs`; do not remove that mount.
4. **Disconnect the old Git integration (optional).** In each worker's **Settings → Build**,
   disconnect the old `trajectonomics/site` and `trajectonomics/docs` repositories, so no build from
   them can overwrite a CI deploy.

## The blog's first deploy

The first deploy of `apps/blog` creates the Worker `blog` and attaches `blog.trajectonomics.com` as
a custom domain, as the docs Worker attaches its host. Nothing in Cloudflare needs creating by hand,
but the hostname must not already be a CNAME, and the API token needs permission to attach a custom
domain on the `trajectonomics.com` zone. Then open `https://blog.trajectonomics.com/`. The router is
not involved.

## The data Worker's first deploy

The `data` Worker owns `data.trajectonomics.com` and reads D1 `traj-data` (the database id is in
`apps/data/wrangler.jsonc`). Create that database in Cloudflare first, and add **D1: Edit** on the
account to the deploy token; the **Edit Cloudflare Workers** template alone cannot apply
migrations. The workflow applies `apps/data/migrations` with
`bunx wrangler d1 migrations apply traj-data --remote` before it deploys the Worker, which attaches
the hostname as a custom domain. The first deploy needs no secret: `/ingest` answers 401 until one
exists. After it, set the temporary bootstrap key and send one batch:

```sh
cd apps/data
bunx wrangler secret put INGEST_BOOTSTRAP_KEY
bunx wrangler d1 migrations apply traj-data --local   # local development only
```

`GET https://data.trajectonomics.com/api/health` shows the last ingest. The key is temporary and the
auth service replaces it (ADR 0004); never commit it and never put it in `wrangler.jsonc`. The read
API caches for an hour, so a fresh batch appears within that window without a deploy.

## White-label deploys

A brand deploys as its own worker: copy an app's `wrangler.jsonc` with a new `name`, and build with
`BRAND=<folder in packages/brand/brands>`. Add it to `deploy.yml` when the first brand exists.
