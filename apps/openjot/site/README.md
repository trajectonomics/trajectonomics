# OpenJot's short links and comparison page

OpenJot's landing page is part of the Trajectonomics Site at
**<https://trajectonomics.com/openjot/>**. This Worker, `moojot-site`, keeps the rest of what the
old site still needs under the same host:

- the download short links (`/openjot/download`, `/openjot/download/checksums`, and a source link
  for each place OpenJot is posted);
- the release API (`/openjot/api/release`);
- the first-party PostHog proxy (`/openjot/ingest/*`), which the app and the comparison page use;
- the OpenJot vs MeowJot comparison page at
  **<https://trajectonomics.com/openjot/meowjot-alternative/>**.

Every other `/openjot/...` path belongs to the Site. The old hosts
`openjot.trajectonomics.com` and `moojot.trajectonomics.com` stay attached only to redirect here
and to keep relaying analytics from installed apps.

The comparison page is plain HTML, CSS and JS with no build step and no dependencies. It is
served by a Cloudflare Worker with Static Assets from a URL prefix (`assets.base_path`).

| Path | What it is |
|---|---|
| `public/` | The comparison page at the root of the assets directory: `index.html`, `styles.css`, `boot.js` (sets the language before paint), `app.js` (language switch, release info, animated Moo), `analytics.js` (cookie banner, then PostHog), `_headers`, `img/`, `fonts/`. Served at `/openjot/meowjot-alternative/` |
| `worker.js` | Worker entry. It owns the `/openjot` paths in `routes` and `run_worker_first`. |
| `release.js` | Request router, the old-host redirects, and the newest `openjot-v*` release lookup. It reads the monorepo's releases (API first, github.com when Cloudflare's shared IPs are rate limited), falls back to the archived `trajectonomics/moojot` release until the first `openjot-v*` exists, then caches the answer for 5 minutes. |
| `tracking.js` | Source links (`/openjot/go/…`, `/openjot/download/…`), cookieless counting of clicks and downloads, and the `/openjot/ingest` proxy to PostHog |
| `release.test.js`, `tracking.test.js` | Tests |
| `wrangler.jsonc` | Worker `moojot-site`: zone routes for `trajectonomics.com/openjot/*` and the custom domains `openjot.trajectonomics.com` and `moojot.trajectonomics.com` |

## Links that matter

- `https://trajectonomics.com/openjot/download` redirects (302) to the `.apk` in the newest
  `openjot-v*` GitHub release. Use this short link in reels and bios. Before the first one it uses
  the archived `trajectonomics/moojot` release; only when neither exists does it land on the
  Site's OpenJot page.
- `https://trajectonomics.com/openjot/download/checksums` redirects to that release's `SHA256SUMS`
  through the same lookup.
- `https://trajectonomics.com/openjot/api/release` returns
  `{ "release": null | { version, apk: { name, size, url }, checksumsUrl, … } }`.
- `https://trajectonomics.com/openjot/meowjot-alternative/` is the comparison page. `?lang=th` /
  `?lang=en` forces a language. Otherwise the page uses the visitor's saved choice, then the
  browser language. Thai is the no-JS default.

## Source links

Use a different link for every place you post, so PostHog can tell which one brings people in.
Each click and each download is counted by the Worker, without cookies, even when the visitor
declines the cookie banner.

- `/openjot/go/<source>` opens the landing page tagged with `utm_source` / `utm_medium` (best for
  bios: the page explains how to install).
- `/openjot/download/<source>` downloads the APK straight away (best when the post already
  explains the install).
- Add a campaign as a second part, for example `/openjot/go/ig/reel-12` or
  `/openjot/download/tiktok/launch`. Use lowercase letters, digits, `-` and `_`, up to 40
  characters.
- A `?lang=` on a `/go` link is not forwarded: the Site's `?lang=` stores a choice and redirects,
  which would drop the `utm_*` tags, so the landing page resolves the Language as it does for any
  visitor.

| Where | Landing page | Direct download |
|---|---|---|
| Instagram | `trajectonomics.com/openjot/go/ig` | `trajectonomics.com/openjot/download/ig` |
| Facebook | `trajectonomics.com/openjot/go/fb` | `trajectonomics.com/openjot/download/fb` |
| X | `trajectonomics.com/openjot/go/x` | `trajectonomics.com/openjot/download/x` |
| Threads | `trajectonomics.com/openjot/go/threads` | `trajectonomics.com/openjot/download/threads` |
| TikTok | `trajectonomics.com/openjot/go/tiktok` | `trajectonomics.com/openjot/download/tiktok` |
| YouTube | `trajectonomics.com/openjot/go/yt` | `trajectonomics.com/openjot/download/yt` |
| LINE | `trajectonomics.com/openjot/go/line` | `trajectonomics.com/openjot/download/line` |
| GitHub | `trajectonomics.com/openjot/go/gh` | `trajectonomics.com/openjot/download/gh` |
| QR code / print | `trajectonomics.com/openjot/go/qr` | `trajectonomics.com/openjot/download/qr` |

Any other slug works too and becomes its own source (`/openjot/go/pantip` →
`utm_source=pantip`). The known slugs and their mediums are `SOURCES` in `tracking.js`.

In PostHog, the events are:

- `link_clicked`: a `/openjot/go/…` link. Properties `source`, `medium`, `campaign`, `link`,
  `country`, `platform`, `in_app_browser`.
- `apk_download`: any `/openjot/download…` hit, with the same properties plus `via` (`link` for
  `/openjot/download/<source>`, `page` for a button on the Site's OpenJot pages, `direct`
  otherwise), `outcome` (`apk`, `coming_soon`, `releases_page`) and `apk_version`. A button click
  on the comparison page takes its source from that page's own `utm_*` tags.
- Visitors who allow cookies also get PostHog's normal web analytics (`$pageview`, autocapture),
  with the `utm_*` tags as the referrer source. Download buttons carry
  `data-ph-capture-attribute-cta`.

Bots and link-preview fetchers (Facebook, WhatsApp, Telegram, Slack, Discord, …) are not counted.

## The domain moves

On 2026-11-26 the landing page moved from `openjot.trajectonomics.com` to the Site's
`https://trajectonomics.com/openjot/`. On 2026-11-27 the rest of the site moved under the same
host: the short links, the release API and the comparison page. Both old hosts stay attached to
the same Worker (`moojot-site`, see `wrangler.jsonc`):

- Every `GET` and `HEAD` on `openjot.trajectonomics.com` or `moojot.trajectonomics.com` answers
  `301` to the same path under `https://trajectonomics.com/openjot`, keeping the query. `/` goes
  to `https://trajectonomics.com/openjot/`, and `/meowjot-alternative` goes to
  `https://trajectonomics.com/openjot/meowjot-alternative/`. The comparison page's old files
  (`/img/*`, `/fonts/*`, `/styles.css`, the scripts, `/sitemap.xml`) go to the same file under
  that path, so a shared card's old `og:image` still loads, and `/robots.txt` and `/llms.txt` go
  to the Site's. Old short links such as `/download/ig` and `/go/ig` keep working, and are counted
  once, at the new address.
- Other methods on the old hosts answer `405` with `Allow: GET, HEAD`.
- The one exception is `/ingest` and `/ingest/*`: it is proxied to PostHog exactly as before.
  App versions up to 1.4.0 send their analytics to `moojot.trajectonomics.com/ingest`, and 1.5.0
  through 1.6.0 send them to `openjot.trajectonomics.com/ingest`; a redirect would drop those
  requests. Versions later than 1.6.0 send them to `https://trajectonomics.com/openjot/ingest`.
- The Worker keeps its name `moojot-site`: renaming it would create a second Worker, which cannot
  take over the custom domain. The name is infrastructure, not the product's.
- `tracking.js` counts a download whose referrer is a page under
  `https://trajectonomics.com/openjot/` as `via: "page"`.
- The apex zone routes send only these paths to this Worker. Every other `/openjot/...` path is
  the Site's, and the Site's Worker keeps it.

## Commands

```bash
node --test site/release.test.js           # unit tests (Node 20+)
cd site && npx wrangler@4 dev --port 8799   # local preview at http://127.0.0.1:8799
cd site && npx wrangler@4 deploy            # deploy by hand (needs a Cloudflare login for the Trajectonomics account)
```

The page is at `http://127.0.0.1:8799/openjot/meowjot-alternative/` in `wrangler dev`, because
`assets.base_path` mounts it there. `wrangler` is run with `npx` on purpose, so the repo's
`package.json` doesn't gain a dependency.

## Deploys

The site deploys from this monorepo's CI, `.github/workflows/deploy.yml`, the same way the other
Workers do. A push to `main` that changes a file under `apps/openjot/site` deploys the Worker; a
push that changes only the rest of `apps/openjot`, or the shared workspace inputs, does not,
because the site has no build and imports nothing from the workspace. To deploy by hand, open
Actions → **Deploy** → **Run workflow** and pick `openjot`. The `DEPLOYS_ENABLED` switch and the
Cloudflare secrets are described in `docs/runbooks/deploy.md`.

The fallback when CI is broken is a deploy with wrangler from this folder: `cd site && npx
wrangler@4 deploy` (see Commands; it needs a Cloudflare login for the Trajectonomics account).

App releases are separate and stay manual: an `openjot-v*` tag pushed by the owner. See
`docs/release/android.md`.

The PostHog project key and region are `vars` in `wrangler.jsonc`. The same key is in
`public/analytics.js` and `src/lib/analytics.ts`, and `tracking.test.js` checks that they match. It
is a public project key that can only send events, so it is not a secret.

## Content rules

- Every piece of copy exists in Thai and English as sibling elements marked `lang="th"` and
  `lang="en"`. CSS hides whichever language isn't active, so add both when you change text.
- Only claim what the app actually does. Check `docs/prd/PRD.md` and `docs/privacy-policy.md`.
- Screenshots in `img/shot-*.webp` were taken from the real Svelte UI using invented sample data.
  Never use a real ledger.
- No cookies and no analytics scripts until the visitor taps "Allow" on the cookie banner. "No
  thanks" must stay as easy as "Allow". The Worker's cookieless counts send only the labels listed
  in `tracking.js`: never an IP address, a user agent, or a persistent ID.
- No third-party requests from the browser. PostHog is served from this domain through
  `/openjot/ingest`, so the CSP in `_headers` stays `'self'`.
- If what is collected changes, update `docs/privacy-policy.md` (sections "Anonymous usage
  statistics" and "Website") in the same PR.

## Search and AI answers

- Every indexable page has a `<link rel="canonical">`, a description in both languages, Open Graph
  tags and JSON-LD structured data (`FAQPage` and `BreadcrumbList` on the comparison page). JSON-LD
  is a data block, not a script, so the CSP doesn't block it.
- The Site owns host-root files now: `robots.txt` and `llms.txt` are served by `apps/site`, not by
  this Worker. The comparison page's canonical is
  `https://trajectonomics.com/openjot/meowjot-alternative/`, and its own sitemap is
  `/openjot/meowjot-alternative/sitemap.xml`, which the Site's `robots.txt` names; its `llms.txt`
  line belongs in the Site's file.
- When FAQ answers change, change the matching JSON-LD answer in the same file.
- The comparison page's scripts and images are served from `/openjot/meowjot-alternative/`, so
  every reference in the page, its CSS and its JS includes that prefix.

## Comparison page

`public/index.html` compares OpenJot with MeowJot (เหมียวจด). Comparing with a named product needs
extra care:

- Every claim about MeowJot comes from MeowJot's own public pages or from its app, listed under
  "Sources" on the page with the date they were checked. Never guess, and leave out what you can't
  check.
- The FAQPage JSON-LD on the comparison page must list exactly the questions and answers visible in
  its FAQ.
- Update the "checked" date in the hero, the table intro, the sources and `article:modified_time`
  whenever you re-check.
- Keep the "MeowJot may suit you better if…" list honest: it's what makes the page believable.
- Keep the non-affiliation line and the trademark note.
- MeowJot screenshots (`img/vs-meowjot-*.webp`) are our own captures of the real app, taken on the
  owner's phone and dated on the page. Blur every amount, name, phone number, birthday and merchant
  in both apps before an image enters the repo, keep the raw captures out of the repo, and look at
  the result at full size. Credit the app's design to KASIKORN X under the screenshots. Never copy
  images from meowjot.com or the app stores.

## Assets

- `img/moo-wave.webp` is `static/mascot/mascot-idle.webp`. `img/moo-still.webp` is its first frame,
  used until the page has loaded.
- `img/icon-*.png` and `img/apple-touch-icon.png` are resized from `static/app-icon.png`.
- `img/og.jpg` (1200×630) is the link preview card. Its source is `og/og.html`, which is not
  deployed (the Worker serves only `public/`). Run these in this folder (`apps/openjot/site`):

  ```bash
  d="$(mktemp -d -p ~/.cache)"
  google-chrome --headless --hide-scrollbars --window-size=1200,630 --screenshot="$d/og.png" "file://$PWD/og/og.html"
  ffmpeg -y -i "$d/og.png" -q:v 3 public/img/og.jpg
  rm -rf "$d"
  ```
- `img/vs-*.webp` (540×1142) are the side-by-side captures on the comparison page, taken from a
  Nothing Phone (Android 16) on 24 Nov 2026 with the status bar cropped off and personal data
  blurred.
- `img/shot-private-{en,th}.webp` and `img/shot-scan-{en,th}.webp` are intro screens 2 and 3 in the
  pink & white theme. The Thai ones (540×1142) were captured from the app; the English ones
  (412×891) are cropped from `docs/onboarding/pink-en-*`. The comparison page shows the one that
  matches the page language.
- `fonts/` holds Noto Sans Thai from `@fontsource/noto-sans-thai` (SIL OFL 1.1, see
  `fonts/OFL.txt`).
