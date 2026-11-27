---
status: accepted
---

# The Site serves OpenJot at /openjot/

> 2026-11-27: `openjot.trajectonomics.com` is deprecated. The `moojot-site` Worker's downloads,
> `/go` links, `/api/release`, `/ingest` and the comparison page now answer under
> `https://trajectonomics.com/openjot/` by zone routes, the Site's download buttons use
> `/openjot/download`, and the old hosts only redirect, except `/ingest`. The old-host passage below
> is the state this record left; `apps/openjot/site/README.md` has the current one.

OpenJot's landing page lived on its own host, `openjot.trajectonomics.com`, built from
`apps/openjot/site` as plain HTML. The owner retired that address on 2026-11-26: the page moves to
the Site, at **`https://trajectonomics.com/openjot/`**, under the Site's design, and the old host
keeps only what a short link and an APK download need. There is no router in front of the Site for
this page: the Site's own Worker answers it, as it answers `/`.

## Decision

- **The Site has a second page, and it has one address.** English is written to `openjot/index.html`
  and Thai to `th/openjot/index.html`, the same two build paths the home uses. `/openjot/` is what a
  visitor copies, what the canonical, `x-default`, `og:url`, Sitemap and Answer engine files name,
  and the only address at which the page is served. `th/openjot/` is a build path: it is not linked,
  listed or canonicalised, and `/th/openjot/` answers 301 to `/` through the old-prefix rule.
- **The Worker answers a small list of page addresses, not one path.** `src/worker/page-address.ts`
  pairs each address with the function that resolves its built file for a Language: `/` with
  `languageHomePath`, `/openjot/` with `openJotAssetPath`. Both get the same Language resolution —
  the stored `traj_lang` choice, then `Accept-Language`, then `cf-ipcountry`, then English — and the
  same `Vary: Cookie, Accept-Language, CF-IPCountry, Sec-GPC, DNT`, `Cache-Control: private, no-cache`,
  conditional-request and consent handling. `/openjot/?lang=<code>` stores the choice and answers 302
  to `/openjot/`; `/openjot/?consent=<answer>` stores that and also returns there. `/openjot` without
  the slash answers 301 to `/openjot/` with the query kept, and both patterns are in
  `run_worker_first`, because the assets layer would otherwise answer the bare path itself.
- **The page is the Site's, with OpenJot's words.** It uses the Site's `Layout`, `Header`, `Footer`,
  consent card, tokens, type and section and card styles. Its strings are two more Dictionaries,
  `en-openjot.ts` and `th-openjot.ts`, with the same keys and the same parity and Thai-text rules as
  the home. The copy is ported from the old page: the hero, the four screenshots, the six feature
  cards, the four privacy claims with their policy and contact links, the three install steps and the
  in-app-browser note, the FAQ and the closing download call to action. Each screenshot is a capture
  of the app's default Trajectonomics theme and each caption states what its screen shows. The
  MeowJot comparison is not ported: that page stays on the old host for now. The
  robot from `public/mascot/` is the only mascot — `hello` over the hero's phone, `lost` in the
  in-app note, `chart` beside the Features heading, `open` beside the checksum note, `think` beside
  the FAQ heading, `wave` above the closing section and `sit` in the footer. Every one is
  decoration with an empty `alt`, and none moves under reduced motion. The old page's piggy is not
  used.
- **The header gains OpenJot.** `OPENJOT_PATH` lives in `src/lib/site.ts`, the Dictionary gains
  `openjotLink` in both Languages, and the header lists Docs, Blog, OpenJot. On the OpenJot page its
  link carries `aria-current="page"`, and a narrow-screen rule keeps the three links, the repository
  count and the Language menu on one 360 px row with no sideways scroll.
- **Downloads stay on the OpenJot Worker.** The main button is
  `https://openjot.trajectonomics.com/download`, which finds the newest `openjot-v*` APK and counts
  the download; the checksum link is `/download/checksums`; the releases line is the GitHub filtered
  releases page. The download links carry `referrerpolicy="no-referrer-when-downgrade"`, so the
  OpenJot Worker sees `/openjot/` in the referrer and counts the click as `via: "page"` instead of
  the origin alone. The Site's build never learns a release URL or a version, so an APK release is not
  a Site deploy. The page states Android 7.0 or newer, 64-bit, and keeps the signing certificate's
  fingerprint verbatim.
- **Search and answers read the page's own facts.** The page carries its Language's title and
  description, a canonical and `og:url` at `/openjot/`, its own 1200 × 630 share image
  (`og/openjot-<language>.png`, written by the same prebuild step), and one JSON-LD block naming the
  `WebSite`, the `Organization`, a `MobileApplication` and the `FAQPage` the page shows. The
  Sitemap lists `/openjot/` once with `x-default` at itself, and `llms.txt` and `llms-full.txt` name
  the page and its summary.
- **The built-file rules judge the new page by the same standard.** The rules written for "every
  Language home" now run over every built page, and each page draws its own words, address, card and
  block from its own registry entry:
  - `checkDocumentTitle` and `checkDescription` take the page's own Dictionary.
  - `checkSocialCard` expects the page's own URL, locale, title, description, image and alt.
  - `checkShareImage` expects a card for each page in each Language.
  - `checkHreflang` expects each page's one `x-default` at that page's own address.
  - `checkSitemap` and `sitemap-alternates.ts` expect every address once, its alternate at itself.
  - `checkSwitcher` builds choice links that return to the page they were chosen on.
  - `checkNoLanguageDetection`, `checkStructuredData` and `checkStructuredDataClaims` run per page.
  - `checkFacts`, `checkSiteLinks`, `checkPageText`, `checkReleaseFacts` and `checkSiteContent` run
    per page: the footer's facts, named links, disclaimer and release line, and the hero's headline
    and sub-line from that page's Dictionary.
  - `checkLlmsFiles` requires the OpenJot link; a new `checkOpenJotPages` requires both build files
    to exist and declare their Language.
  - `checkPageLinks` and `checkInstallWindow` stay home-only, because the Demo link, the CLI install
    link and the prompt belong to the home and no other page.
  - No rule, `biome.json`, `tsconfig` or budget was loosened. `scripts/share-image.ts` writes four
    cards instead of two, and `e2e/pages.ts` gains the OpenJot page for the generic accessibility,
    Language and visual checks plus a 360 px header check.
- **The old host becomes a redirect and a download service.** `openjot.trajectonomics.com/` and
  `/meowjot-alternative` stay served by the `moojot-site` Worker: `/` answers 301 to `/openjot/`
  with the query kept, `/go/<source>` still counts and now 302s to `/openjot/` with the same
  `utm_*` tags, `/download*`, `/api/release` and `/ingest*` are unchanged, and
  `moojot.trajectonomics.com` still redirects to the openjot host except `/ingest`. The comparison
  page changes its home and install links to `https://trajectonomics.com/openjot/`, and its download
  calls to action keep using `/download`. `tracking.js` counts a download whose referrer is
  `https://trajectonomics.com/openjot...` as `via: "page"`. The old `public/index.html` is removed;
  its assets are kept when the comparison page, the 404 page or `og/og.html` uses them.

## Considered Options

- **Keep the page on its own host and link it from the header.** Rejected by the owner: the page
  moves into the Site, so it reads as part of trajectonomics.com and needs no second deploy of copy.
- **Put the page behind a router route.** Rejected: no router change is needed for a static page the
  Site can build, and the Worker already owns the Language resolution for `/`.
- **Let the assets layer answer `/openjot` without the slash.** Rejected: the bare path is not in
  `run_worker_first` as a directory, and on the old host it must reach the Worker's redirect. Listing
  both patterns makes one Worker own the address in every spelling.
- **Copy the APK URL into the Site at build time.** Rejected: it would make every APK release a Site
  deploy, and the OpenJot Worker's short link is already the stable URL a reel prints.
- **Move the MeowJot comparison too.** Deferred: it compares a named product and carries its own
  sources and checked date; moving it is a separate decision with its own review.
- **Keep the home's share image for OpenJot.** Rejected: the card's statement is about traj, so the
  OpenJot page gets its own statement in the same lockup, layout and Theme.

## Consequences

- The header shows one more link on every page, and the visual baselines change with it.
- A new page in a new Language is two Dictionary files, two page files and one registry entry; the
  Worker's address list and the Sitemap's page list grow by one line each.
- The old host still answers `/` and the comparison page, so its Worker, its assets and its
  `run_worker_first` list stay; only the landing page's file, its page-only assets and its own
  structured data leave it.
- The Site's Sitemap and IndexNow payload now submit two addresses, and the built-file checks judge
  both pages in both Languages.
- `bun run test:browser` judges `/openjot/` at both viewports in both Languages, and a 360 px header
  check keeps the third link from pushing the bar sideways.
