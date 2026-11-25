# moojot.trajectonomics.com

This is the landing page for MooJot. It's built for people arriving from short-form video (Instagram reels) on an Android phone, so its main job is to get the app installed: a download button, three install steps, and a tip for getting out of in-app browsers.

The page is plain HTML, CSS and JS with no build step and no dependencies. It's served by a Cloudflare Worker with Static Assets.

| Path | What it is |
|---|---|
| `public/` | The static site: `index.html`, `styles.css`, `boot.js` (sets the language before paint), `app.js` (language switch, release info, animated Moo), `analytics.js` (cookie banner, then PostHog), `_headers`, `404.html`, `img/`, `fonts/` |
| `public/meowjot-alternative.html` | The MooJot vs MeowJot comparison page, served at `/meowjot-alternative` |
| `public/robots.txt`, `sitemap.xml`, `llms.txt` | Search and AI-answer engine files. See "Search and AI answers" below |
| `worker.js` | Worker entry. It only runs for `/download*`, `/go*`, `/api/*` and `/ingest/*` (see `run_worker_first`). |
| `release.js` | Request router, and the newest `openjot-v*` release lookup. It reads the monorepo's releases (API first, github.com when Cloudflare's shared IPs are rate limited), falls back to the archived `trajectonomics/moojot` release until the first `openjot-v*` exists, then caches the answer for 5 minutes. |
| `tracking.js` | Source links (`/go/…`, `/download/…`), cookieless counting of clicks and downloads, and the `/ingest` proxy to PostHog |
| `release.test.js`, `tracking.test.js` | Tests |
| `wrangler.jsonc` | Worker `moojot-site` on the custom domain `moojot.trajectonomics.com` |

## Links that matter

- `https://moojot.trajectonomics.com/download` redirects (302) to the `.apk` in the newest `openjot-v*` GitHub release. Use this short link in reels and bios. Before the first one it uses the archived `trajectonomics/moojot` release; only when neither exists does it land on `/#coming-soon`.
- `https://moojot.trajectonomics.com/download/checksums` redirects to that release's `SHA256SUMS` through the same lookup.
- `https://moojot.trajectonomics.com/api/release` returns `{ "release": null | { version, apk: { name, size, url }, checksumsUrl, … } }`.
- `?lang=th` / `?lang=en` forces a language. Otherwise the page uses the visitor's saved choice, then the browser language. Thai is the no-JS default.

## Source links

Use a different link for every place you post, so PostHog can tell which one brings people in. Each click and each download is counted by the Worker, without cookies, even when the visitor declines the cookie banner.

- `/go/<source>` opens the landing page tagged with `utm_source` / `utm_medium` (best for bios: the page explains how to install).
- `/download/<source>` downloads the APK straight away (best when the post already explains the install).
- Add a campaign as a second part, for example `/go/ig/reel-12` or `/download/tiktok/launch`. Use lowercase letters, digits, `-` and `_`, up to 40 characters.
- `/go/ig?lang=en` also forces the page language.

| Where | Landing page | Direct download |
|---|---|---|
| Instagram | `moojot.trajectonomics.com/go/ig` | `moojot.trajectonomics.com/download/ig` |
| Facebook | `moojot.trajectonomics.com/go/fb` | `moojot.trajectonomics.com/download/fb` |
| X | `moojot.trajectonomics.com/go/x` | `moojot.trajectonomics.com/download/x` |
| Threads | `moojot.trajectonomics.com/go/threads` | `moojot.trajectonomics.com/download/threads` |
| TikTok | `moojot.trajectonomics.com/go/tiktok` | `moojot.trajectonomics.com/download/tiktok` |
| YouTube | `moojot.trajectonomics.com/go/yt` | `moojot.trajectonomics.com/download/yt` |
| LINE | `moojot.trajectonomics.com/go/line` | `moojot.trajectonomics.com/download/line` |
| GitHub | `moojot.trajectonomics.com/go/gh` | `moojot.trajectonomics.com/download/gh` |
| QR code / print | `moojot.trajectonomics.com/go/qr` | `moojot.trajectonomics.com/download/qr` |

Any other slug works too and becomes its own source (`/go/pantip` → `utm_source=pantip`). The known slugs and their mediums are `SOURCES` in `tracking.js`.

In PostHog, the events are:

- `link_clicked`: a `/go/…` link. Properties `source`, `medium`, `campaign`, `link`, `country`, `platform`, `in_app_browser`.
- `apk_download`: any `/download…` hit, with the same properties plus `via` (`link` for `/download/<source>`, `page` for a button on the landing page, `direct` otherwise), `outcome` (`apk`, `coming_soon`, `releases_page`) and `apk_version`. A button click on the landing page takes its source from the page's own `utm_*` tags.
- Visitors who allow cookies also get PostHog's normal web analytics (`$pageview`, autocapture), with the `utm_*` tags as the referrer source. Download buttons carry `data-ph-capture-attribute-cta` (`hero`, `install`, `final`).

Bots and link-preview fetchers (Facebook, WhatsApp, Telegram, Slack, Discord, …) are not counted.

## Commands

```bash
node --test site/release.test.js           # unit tests (Node 20+)
cd site && npx wrangler@4 dev --port 8799   # local preview at http://127.0.0.1:8799
cd site && npx wrangler@4 deploy            # deploy by hand (needs a Cloudflare login for the Trajectonomics account)
```

`wrangler` is run with `npx` on purpose, so the repo's `package.json` doesn't gain a dependency.

## Deploys

The site deploys from this monorepo's CI, `.github/workflows/deploy.yml`, the same way the other Workers do. A push to `main` that changes a file under `apps/openjot/site` deploys the Worker; a push that changes only the rest of `apps/openjot`, or the shared workspace inputs, does not, because the site has no build and imports nothing from the workspace. To deploy by hand, open Actions → **Deploy** → **Run workflow** and pick `openjot`. The `DEPLOYS_ENABLED` switch and the Cloudflare secrets are described in `docs/runbooks/deploy.md`.

The fallback when CI is broken is a deploy with wrangler from this folder: `cd site && npx wrangler@4 deploy` (see Commands; it needs a Cloudflare login for the Trajectonomics account).

App releases are separate and stay manual: an `openjot-v*` tag pushed by the owner. See `docs/release/android.md`.

The PostHog project key and region are `vars` in `wrangler.jsonc`. The same key is in `public/analytics.js` and `src/lib/analytics.ts`, and `tracking.test.js` checks that they match. It is a public project key that can only send events, so it is not a secret.

## Content rules

- Every piece of copy exists in Thai and English as sibling elements marked `lang="th"` and `lang="en"`. CSS hides whichever language isn't active, so add both when you change text.
- Only claim what the app actually does. Check `docs/prd/PRD.md` and `docs/privacy-policy.md`.
- Screenshots in `img/shot-*.webp` were taken from the real Svelte UI using invented sample data. Never use a real ledger.
- The roadmap section links to GitHub issues. A feature moves to "Releasing soon" once its PR is done, and to "Released" when a release ships it.
- No cookies and no analytics scripts until the visitor taps "Allow" on the cookie banner. "No thanks" must stay as easy as "Allow". The Worker's cookieless counts send only the labels listed in `tracking.js`: never an IP address, a user agent, or a persistent ID.
- No third-party requests from the browser. PostHog is served from this domain through `/ingest`, so the CSP in `_headers` stays `'self'`.
- If what is collected changes, update `docs/privacy-policy.md` (sections "Anonymous usage statistics" and "Website") in the same PR.

## Search and AI answers

- Every indexable page has a `<link rel="canonical">`, a description in both languages, Open Graph tags and JSON-LD structured data (`MobileApplication` and `FAQPage` on the home page, `FAQPage` and `BreadcrumbList` on the comparison page). JSON-LD is a data block, not a script, so the CSP doesn't block it.
- When you add a page, add it to `sitemap.xml` (with `lastmod`) and to `llms.txt`, and give its `<html>` a `data-title-th` and `data-title-en`: `app.js` swaps the tab title when the language changes.
- When FAQ answers change, change the matching JSON-LD answer in the same file.
- `robots.txt` lets every crawler in, including AI crawlers, and keeps them off `/download`, `/go/`, `/api/` and `/ingest/`.
- `llms.txt` is a plain summary for AI assistants. Keep its facts in step with the page.

## Comparison page

`meowjot-alternative.html` compares MooJot with MeowJot (เหมียวจด). Comparing with a named product needs extra care:

- Every claim about MeowJot comes from MeowJot's own public pages or from its app, listed under "Sources" on the page with the date they were checked. Never guess, and leave out what you can't check.
- The FAQPage JSON-LD on the comparison page must list exactly the questions and answers visible in its FAQ.
- Update the "checked" date in the hero, the table intro, the sources and `article:modified_time` whenever you re-check.
- Keep the "MeowJot may suit you better if…" list honest: it's what makes the page believable.
- Keep the non-affiliation line and the trademark note.
- MeowJot screenshots (`img/vs-meowjot-*.webp`) are our own captures of the real app, taken on the owner's phone and dated on the page. Blur every amount, name, phone number, birthday and merchant in both apps before an image enters the repo, keep the raw captures out of the repo, and look at the result at full size. Credit the app's design to KASIKORN X under the screenshots. Never copy images from meowjot.com or the app stores.

## Assets

- `img/moo-wave.webp` is `static/mascot/mascot-idle.webp`. `img/moo-still.webp` is its first frame, used until the page has loaded.
- `img/icon-*.png` and `img/apple-touch-icon.png` are resized from `static/app-icon.png`.
- `img/og.jpg` (1200×630) is the link preview card.
- `img/vs-*.webp` (540×1142) are the side-by-side captures on the comparison page, taken from a Nothing Phone (Android 16) on 24 Nov 2026 with the status bar cropped off and personal data blurred.
- `img/shot-private-{en,th}.webp` and `img/shot-scan-{en,th}.webp` are intro screens 2 and 3 in the pink & white theme. The Thai ones (540×1142) were captured from the app; the English ones (412×891) are cropped from `docs/onboarding/pink-en-*`. The comparison page shows the one that matches the page language.
- Every MooJot screenshot on the site uses the pink & white theme, so the site looks like one app.
- `fonts/` holds Noto Sans Thai from `@fontsource/noto-sans-thai` (SIL OFL 1.1, see `fonts/OFL.txt`).
