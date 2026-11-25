# openjot.trajectonomics.com

The landing page moved to the Site on 2026-11-26: it is now at
**<https://trajectonomics.com/openjot/>**, built in `apps/site` and served by that Site's Worker. This
host keeps the short links the app and its reels depend on: the newest APK, its checksums, the release
API, the `/go/<source>` links and the MeowJot comparison page. Its `/` answers 301 to the Site.

The subdomain is a Cloudflare Worker with Static Assets, plain JS and no build step. Its tests are
Node tests in this folder.

| Path | What it is |
|---|---|
| `public/` | The static files: `styles.css`, `boot.js`, `app.js`, `analytics.js`, `_headers`, `404.html`, `img/`, `fonts/` |
| `public/meowjot-alternative.html` | The OpenJot vs MeowJot comparison page, served at `/meowjot-alternative` |
| `public/robots.txt`, `sitemap.xml`, `llms.txt` | Search and AI-answer engine files. See "Search and AI answers" below |
| `worker.js` | Worker entry. It only runs for `/`, `/meowjot-alternative`, `/download*`, `/go*`, `/api/*` and `/ingest/*` (see `run_worker_first`). |
| `release.js` | Request router, and the newest `openjot-v*` release lookup. It reads the monorepo's releases (API first; when Cloudflare's shared IPs are rate limited, the repository's git ref advertisement at `trajectonomics/trajectonomics.git/info/refs`, then each tag's page), falls back to the archived `trajectonomics/moojot` release until the first `openjot-v*` exists, then caches the answer for 5 minutes. |
| `tracking.js` | Source links (`/go/…`, `/download/…`), cookieless counting of clicks and downloads, and the `/ingest` proxy to PostHog |
| `release.test.js`, `tracking.test.js` | Tests |
| `wrangler.jsonc` | Worker `moojot-site` on the custom domains `openjot.trajectonomics.com` and `moojot.trajectonomics.com` |

## What the subdomain still does

- `https://openjot.trajectonomics.com/` answers **301** to `https://trajectonomics.com/openjot/`,
  keeping the query.
- `/meowjot-alternative` is served here, with its home and install links pointing at the Site's
  OpenJot page. The comparison stays on this host for now.
- `/download` redirects (302) to the `.apk` in the newest `openjot-v*` GitHub release. Use this short
  link in reels and bios. Before the first one it uses the archived `trajectonomics/moojot` release;
  only when neither exists does it land on `https://trajectonomics.com/openjot/`.
- `/download/checksums` redirects to that release's `SHA256SUMS` through the same lookup.
- `/api/release` returns `{ "release": null | { version, apk: { name, size, url }, checksumsUrl, … } }`.
- `/go/<source>` still counts a click and redirects (302) to
  `https://trajectonomics.com/openjot/` with the same `utm_*` tags. A `?lang=` on the link is dropped:
  the Site picks the Language itself, and its `?lang=` would redirect away the `utm_*` tags.

## Source links

Use a different link for every place you post, so PostHog can tell which one brings people in. Each
click and each download is counted by the Worker, without cookies, even when the visitor declines the
cookie banner.

- `/go/<source>` opens the Site's landing page tagged with `utm_source` / `utm_medium` (best for bios:
  the page explains how to install).
- `/download/<source>` downloads the APK straight away (best when the post already explains the install).
- Add a campaign as a second part, for example `/go/ig/reel-12` or `/download/tiktok/launch`. Use
  lowercase letters, digits, `-` and `_`, up to 40 characters.

| Where | Landing page | Direct download |
|---|---|---|
| Instagram | `openjot.trajectonomics.com/go/ig` | `openjot.trajectonomics.com/download/ig` |
| Facebook | `openjot.trajectonomics.com/go/fb` | `openjot.trajectonomics.com/download/fb` |
| X | `openjot.trajectonomics.com/go/x` | `openjot.trajectonomics.com/download/x` |
| Threads | `openjot.trajectonomics.com/go/threads` | `openjot.trajectonomics.com/download/threads` |
| TikTok | `openjot.trajectonomics.com/go/tiktok` | `openjot.trajectonomics.com/download/tiktok` |
| YouTube | `openjot.trajectonomics.com/go/yt` | `openjot.trajectonomics.com/download/yt` |
| LINE | `openjot.trajectonomics.com/go/line` | `openjot.trajectonomics.com/download/line` |
| GitHub | `openjot.trajectonomics.com/go/gh` | `openjot.trajectonomics.com/download/gh` |
| QR code / print | `openjot.trajectonomics.com/go/qr` | `openjot.trajectonomics.com/download/qr` |

Any other slug works too and becomes its own source (`/go/pantip` → `utm_source=pantip`). The known
slugs and their mediums are `SOURCES` in `tracking.js`.

In PostHog, the events are:

- `link_clicked`: a `/go/…` link. Properties `source`, `medium`, `campaign`, `link`, `country`,
  `platform`, `in_app_browser`.
- `apk_download`: any `/download…` hit, with the same properties plus `via` (`link` for
  `/download/<source>`, `page` for a button on the Site's OpenJot page, `direct` otherwise), `outcome`
  (`apk`, `coming_soon`, `releases_page`) and `apk_version`. A button on the Site's page takes its
  source from that page's own `utm_*` tags.
- Visitors who allow cookies on the Site get the Site's own analytics, under the Site's cookie
  notice. This host's comparison page still asks with its own banner and loads PostHog after "Allow".

Bots and link-preview fetchers (Facebook, WhatsApp, Telegram, Slack, Discord, …) are not counted.

## The domain move

The site moved from `moojot.trajectonomics.com` to `openjot.trajectonomics.com`. Both hosts attach to
the same Worker (`moojot-site`, see `wrangler.jsonc`):

- The old host answers `301` to the new host, keeping the path and the query, for `GET` and `HEAD`.
  The app's short links, QR codes and reels keep working, and `/` then makes the second hop to the
  Site's page.
- `/`, `/meowjot-alternative`, `/download*`, `/go*`, `/api/*` and `/ingest/*` are in
  `run_worker_first`, so every one of them reaches the Worker. `/` must be there for the redirect.
  Images, CSS, JS, fonts, `robots.txt`, `sitemap.xml` and `llms.txt` stay asset-first and never wake
  the Worker.
- The one exception is `/ingest` and `/ingest/*`: it is proxied to PostHog exactly as before. App
  versions up to 1.4.0 send their analytics to `moojot.trajectonomics.com/ingest`, and a redirect
  would drop those requests.
- The Worker keeps its name `moojot-site`: renaming it would create a second Worker, which cannot take
  over the custom domain. The name is infrastructure, not the product's.
- `tracking.js` counts a download whose referrer is `https://trajectonomics.com/openjot…` as
  `via: "page"`, the same as a button on the old page, so the Site's page keeps its attribution.

## Commands

```bash
node --test site/release.test.js           # unit tests (Node 20+)
cd site && npx wrangler@4 dev --port 8799   # local preview at http://127.0.0.1:8799
cd site && npx wrangler@4 deploy            # deploy by hand (needs a Cloudflare login for the Trajectonomics account)
```

`wrangler` is run with `npx` on purpose, so the repo's `package.json` doesn't gain a dependency.

## Deploys

The site deploys from this monorepo's CI, `.github/workflows/deploy.yml`, the same way the other
Workers do. A push to `main` that changes a file under `apps/openjot/site` deploys the Worker; a push
that changes only the rest of `apps/openjot`, or the shared workspace inputs, does not, because the
site has no build and imports nothing from the workspace. To deploy by hand, open Actions →
**Deploy** → **Run workflow** and pick `openjot`. The `DEPLOYS_ENABLED` switch and the Cloudflare
secrets are described in `docs/runbooks/deploy.md`.

The fallback when CI is broken is a deploy with wrangler from this folder:
`cd site && npx wrangler@4 deploy` (see Commands; it needs a Cloudflare login for the Trajectonomics
account).

App releases are separate and stay manual: an `openjot-v*` tag pushed by the owner. See
`docs/release/android.md`.

## Content rules

- The landing page's copy now lives in `apps/site`, in `src/lib/language/{en,th}-openjot.ts`. Change
  it there, in both Languages, or the Site's built-file checks fail.
- This host's pages still carry every piece of copy in Thai and English as sibling elements marked
  `lang="th"` and `lang="en"`. CSS hides whichever language isn't active, so add both when you
  change text.
- Only claim what the app actually does. Check `docs/prd/PRD.md` and `docs/privacy-policy.md`.
- Screenshots in `img/shot-*.webp` were taken from the real Svelte UI using invented sample data.
  Never use a real ledger.
- The comparison page's claims come from MeowJot's own public pages or its app, listed under
  "Sources" on the page with the date they were checked.
- No cookies and no analytics scripts until the visitor taps "Allow" on the comparison page's cookie
  banner. "No thanks" must stay as easy as "Allow". The Worker's cookieless counts send only the
  labels listed in `tracking.js`: never an IP address, a user agent, or a persistent ID.
- No third-party requests from the browser. PostHog is served from this domain through `/ingest`, so
  the CSP in `_headers` stays `'self'`.
- If what is collected changes, update `docs/privacy-policy.md` (sections "Anonymous usage statistics"
  and "Website") in the same PR.

## Search and AI answers

- The comparison page has a `<link rel="canonical">`, a description in both languages, Open Graph
  tags and JSON-LD structured data (`WebPage`, `BreadcrumbList` and `FAQPage`). JSON-LD is a data
  block, not a script, so the CSP doesn't block it.
- The Site's OpenJot page publishes its own canonical, sitemap entry and JSON-LD
  (`MobileApplication` and `FAQPage`). This host does not duplicate them.
- The sitemap lists the comparison page only. The landing page is on `trajectonomics.com` and is
  listed in that Site's sitemap.
- `llms.txt` names the Site's landing page, the comparison page here, and the download short link.
- When FAQ answers change, change the matching JSON-LD answer in the same file.
- `robots.txt` lets every crawler in, including AI crawlers, and keeps them off `/download`, `/go/`,
  `/api/` and `/ingest/`.

## Comparison page

`meowjot-alternative.html` compares OpenJot with MeowJot (เหมียวจด). Comparing with a named product
needs extra care:

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
- `img/og.jpg` (1200×630) is the comparison page's link preview card. Its source is `og/og.html`,
  which is not deployed (the Worker serves only `public/`). Run these in this folder
  (`apps/openjot/site`):

  ```bash
  d="$(mktemp -d -p ~/.cache)"
  google-chrome --headless --hide-scrollbars --window-size=1200,630 --screenshot="$d/og.png" "file://$PWD/og/og.html"
  ffmpeg -y -i "$d/og.png" -q:v 3 public/img/og.jpg
  rm -rf "$d"
  ```
- `img/vs-*.webp` (540×1142) are the side-by-side captures on the comparison page, taken from a
  Nothing Phone (Android 16) on 24 Nov 2026 with the status bar cropped off and personal data blurred.
- `img/shot-private-{en,th}.webp` and `img/shot-scan-{en,th}.webp` are intro screens 2 and 3 in the
  pink & white theme. The Thai ones (540×1142) were captured from the app; the English ones
  (412×891) are cropped from `docs/onboarding/pink-en-*`. The comparison page shows the one that
  matches the page language.
- The Site's OpenJot page copies `shot-home.webp`, `shot-summary.webp`, `shot-scan-en.webp` and
  `shot-scan-th.webp` into `apps/site/public/openjot/` and keeps their names.
- Every OpenJot screenshot on the Site uses the pink & white theme, so the Site looks like one app.
- `fonts/` holds Noto Sans Thai from `@fontsource/noto-sans-thai` (SIL OFL 1.1, see `fonts/OFL.txt`).
