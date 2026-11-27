# Deploy runbook

The Site (`apps/site`, worker `site`), the Docs Portal (`apps/docs`, worker `docs`), the blog
(`apps/blog`, worker `blog`), the data Worker (`apps/data`, worker `data`), the auth Worker
(`apps/auth`, worker `auth`) and OpenJot's download and comparison Worker (`apps/openjot/site`,
worker `moojot-site`) deploy to Cloudflare Workers from this repository's CI:
`.github/workflows/deploy.yml`. Cloudflare's own Git integration (Workers Builds) is not used, so the
whole deploy is configured and reviewed here. There is no router: every static site is served under
`trajectonomics.com`, the Site on its apex Custom Domain (with OpenJot's page at `/openjot/`) and the
docs, blog and data Workers on zone routes for `/docs`, `/blog` and `/data`. The auth Worker is the
one product on an origin of its own, `auth.trajectonomics.com`, on purpose: an XSS on a site sharing
one host could otherwise make credentialed requests to the auth endpoints. The OpenJot Worker
`moojot-site` serves the APK short links (`/openjot/download`, `/openjot/go/...`), the
release API, the analytics proxy and the MeowJot comparison page under `trajectonomics.com/openjot/` by
zone routes. `openjot.trajectonomics.com` and `moojot.trajectonomics.com` stay attached to redirect
there, and to keep relaying `/ingest` for installed apps.

## How deploys happen

- **Off until switched on.** Nothing runs while the repository variable `DEPLOYS_ENABLED` is not
  `true`.
- **Push to main.** Each app deploys when its folder changed, or a shared input did:
  `packages/brand`, `packages/site-header`, `tooling/config`, `bun.lock`, the root `package.json` or
  `turbo.json`. The
  landing site is the exception: it has no build and no workspace imports, so only
  `apps/openjot/site` counts.
- **By hand.** From main, deploy one app or all of them:
  ```sh
  gh workflow run deploy.yml --ref main -f app=all    # or site, docs, blog, data, auth, openjot
  ```
- **Build.** `bunx turbo run build --filter=@trajectonomics/<app>`, which builds `packages/brand`
  first (every app imports its `dist/current/`), then `bunx wrangler deploy` in the app folder. For
  `apps/auth`, `wrangler deploy` bundles `src/worker.ts` again and uploads the built `dist-site` (the
  static pages) as its assets; its `dist` is only the build's dry run. The landing site has nothing to build: it
  deploys with `bunx wrangler deploy` in `apps/openjot/site`.
- **Roll back.** Revert the commit on main (a new deploy follows), or in the Cloudflare dashboard
  open the worker → **Deployments** and roll back to an earlier version.

## One-time setup

1. **API token (owner, Cloudflare dashboard).** **My Profile → API Tokens → Create Token →** the
   **Edit Cloudflare Workers** template. Under **Account Resources**, pick only the Trajectonomics
   account; under **Zone Resources**, only `trajectonomics.com`. The template cannot apply D1
   migrations, so add **D1: Edit** on the account to the token (the data and auth Workers apply
   theirs before they deploy). Create it, and copy it once.
2. **Secrets and the switch.** Store the token and the account ID, then switch deploys on:
   ```sh
   gh secret set CLOUDFLARE_API_TOKEN -R trajectonomics/trajectonomics       # paste the token
   gh secret set CLOUDFLARE_ACCOUNT_ID -R trajectonomics/trajectonomics      # the account ID
   gh variable set DEPLOYS_ENABLED --body true -R trajectonomics/trajectonomics
   ```
   The account ID is on the dashboard's **Workers & Pages** overview, or comes from
   `curl -s -H "Authorization: Bearer $TOKEN" https://api.cloudflare.com/client/v4/accounts`.
3. **First deploy.** `gh workflow run deploy.yml --ref main -f app=all`, then open
   trajectonomics.com, trajectonomics.com/docs/, trajectonomics.com/blog/,
   trajectonomics.com/data/api/health, auth.trajectonomics.com/ and trajectonomics.com/openjot/.
   `/contribute/tax/` exists only in builds from this repository, so
   `trajectonomics.com/docs/contribute/tax/` answering 200 proves the new deploy is live. The docs
   Worker declares the zone route `trajectonomics.com/docs*` on deploy and keeps
   `docs.trajectonomics.com` attached only to redirect to the new path. That old hostname must not
   already be a CNAME, and the API token needs permission to manage custom domains on the
   `trajectonomics.com` zone. The zone route serves `/docs`; do not remove it.
4. **Disconnect the old Git integrations (optional).** In each worker's **Settings → Build**,
   disconnect the old `trajectonomics/site`, `trajectonomics/docs` and `trajectonomics/moojot`
   repositories, so no build from them can overwrite a CI deploy.

## The blog's first deploy

The first deploy of `apps/blog` creates the Worker `blog`, declares the zone route
`trajectonomics.com/blog*` and keeps `blog.trajectonomics.com` attached only to redirect to
`https://trajectonomics.com/blog/`, as the docs Worker does for its path. Nothing in Cloudflare needs
creating by hand, but the old hostname must not already be a CNAME, and the API token needs permission
to manage custom domains on the `trajectonomics.com` zone. Then open
`https://trajectonomics.com/blog/`.

## The data Worker's first deploy

The `data` Worker owns `trajectonomics.com/data*` and reads D1 `traj-data` (the database id is in
`apps/data/wrangler.jsonc`). Create that database in Cloudflare first, and add **D1: Edit** on the
account to the deploy token; the **Edit Cloudflare Workers** template alone cannot apply
migrations. The workflow applies `apps/data/migrations` with
`bunx wrangler d1 migrations apply traj-data --remote` before it deploys the Worker, which declares
its zone route. Its old host `data.trajectonomics.com` stays attached: it redirects its pages to
`/data`, and it still answers `/api/*` and `/ingest`. The first deploy needs no secret:
`/data/ingest` answers 401 until one exists. After it, set the temporary bootstrap key and send one batch:

```sh
cd apps/data
bunx wrangler secret put INGEST_BOOTSTRAP_KEY
bunx wrangler d1 migrations apply traj-data --local   # local development only
```

`GET https://trajectonomics.com/data/api/health` shows the last ingest. The old
`https://data.trajectonomics.com/api/health` still answers too, and the old
`https://data.trajectonomics.com/ingest` still accepts a batch beside
`https://trajectonomics.com/data/ingest`. The key is temporary and the auth service replaces it
(ADR 0004); never commit it and never put it in `wrangler.jsonc`. The read API caches for an hour, so
a fresh batch appears within that window without a deploy.

## The auth Worker's first deploy

The `auth` Worker owns `auth.trajectonomics.com` as a Custom Domain (`routes` with
`custom_domain: true` in `apps/auth/wrangler.jsonc`), and it reads D1 `traj-auth` (the database id is
in that file). Create the database in Cloudflare before the first deploy, and keep **D1: Edit** on the
deploy token: the workflow applies `apps/auth/migrations` with
`bunx wrangler d1 migrations apply traj-auth --remote` before it deploys the Worker, so the schema is
ahead of the code that reads it. Reverting a commit does not undo a migration that was applied, so
every migration must still work with the Worker deployed before it.

The Worker needs five secrets. They live in Cloudflare only, never in this repository (its
`.dev.vars` is untracked and `.dev.vars.example` holds placeholders); the names are:

- `BETTER_AUTH_SECRET`: signs session cookies and encrypts the Ed25519 private key that Better Auth
  keeps in the `jwks` table. Replacing it signs everyone out, and token signing then fails with
  `Failed to decrypt private key` until the `jwks` rows are deleted, so a new key pair is made (every
  access token signed with the old key stops verifying at once).
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: the Google OAuth app.
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`: the GitHub OAuth app.

With two Cloudflare accounts on the machine, set `CLOUDFLARE_ACCOUNT_ID` to the Trajectonomics
account first (`apps/auth/AGENTS.md`), or wrangler stops and asks which one.

```sh
cd apps/auth
bunx wrangler secret put BETTER_AUTH_SECRET --name auth
bunx wrangler secret put GOOGLE_CLIENT_ID --name auth
bunx wrangler secret put GOOGLE_CLIENT_SECRET --name auth
bunx wrangler secret put GITHUB_CLIENT_ID --name auth
bunx wrangler secret put GITHUB_CLIENT_SECRET --name auth
```

All five are set in the Trajectonomics account already; this is what a new account or a replacement
secret repeats. The Google and GitHub apps' redirect URIs point at
`https://auth.trajectonomics.com/api/auth/callback/<provider>`. Local runs need none of them:
`bun run test:e2e` starts `wrangler dev --local` with placeholder values and a scratch D1 database
under `~/.cache`.

After a deploy, open `https://auth.trajectonomics.com/`: `/api/auth/ok` answering is the Worker, and
every other path is a static page.

## White-label deploys

A brand deploys as its own worker: copy an app's `wrangler.jsonc` with a new `name`, and build with
`BRAND=<folder in packages/brand/brands>`. Add it to `deploy.yml` when the first brand exists.
