# Site

The public page at the root of trajectonomics.com, in Thai and English. The router mounts it at `/` and sends `/docs` to the Docs Portal.

## Language

**Site**:
This repository's static microfrontend, mounted at `/` of trajectonomics.com.
_Avoid_: Landing page, home page, marketing site

**Language**:
Thai (`th`) or English (`en`), the two native languages of the Site. English is the fallback.
_Avoid_: Translation, copy, tongue

**Skill**:
A package of instructions a coding agent follows, installed into that agent rather than imported by a program. traj ships as one.
_Avoid_: Plugin, extension, package

**Onboarding skill**:
The Skill `traj-onboarding`, the one the Site's install command installs: it asks about the visitor's money, sets up the traj CLI, and starts them off.
_Avoid_: Setup skill, getting-started skill

**CLI**:
The `traj` command-line program (`@trajectonomics/cli`) that does the arithmetic: same input, same answer, every time, and it never calls a model.
_Avoid_: Binary, tool, executable

**Install path**:
One way a visitor gets traj onto their machine: the Site's one command, which installs the Onboarding skill into a coding agent, or the Docs Portal's CLI installation page, which lists the CLI's install channels. The Site prints the one command and names the Docs Portal for the other.
_Avoid_: Install method, installer, setup path

**Stable release**:
A release the owner names as no longer alpha. The first is `v0.1.0`, for both the CLI and the Onboarding skill, announced on the Site with its date.
_Avoid_: GA, production release, 1.0

**Locale URL**:
A Site URL whose first segment is a Language code, `/th/…` or `/en/…`. It is the only record of which Language a page is.
_Avoid_: Language prefix, translated URL

**Visitor signal**:
The `Accept-Language` header, otherwise the `cf-ipcountry` header, read only to choose the redirect from `/`. Not the HTTP `Origin` header.
_Avoid_: Origin, geolocation

**Dictionary**:
The strings for one Language. Every Language has the same keys.
_Avoid_: Translation file, messages, catalog

**Worker with Static Assets**:
The Site's Worker that serves the built files. Its only script is the redirect from `/` to a Locale URL.
_Avoid_: Assets Worker, site server, hosting

**Not-found page**:
The built page served with HTTP status 404 when a path is not in the Site.
_Avoid_: soft 404, error page

**Reserved preload path**:
The path `/__mf-preload.js`, owned by the router and never built by the Site.
_Avoid_: preload script, client router

## Built site

**Theme**:
The published colour set a page asks for with `data-theme`, one value per Semantic Token Role. The Site ships one, light, for every visitor: it never follows the device's scheme, and both published Themes stay in the build ([ADR 0011](docs/adr/0011-the-site-ships-the-light-theme.md)).
_Avoid_: Colour scheme, dark mode, colour mode

**Surface**:
A published Semantic Token Role a landmark paints behind its content, and the text role that belongs on it:
`background`/`foreground`, `muted`/`foreground`, `stage`/`stage-foreground` ([ADR 0008](docs/adr/0008-landmark-surface-roles.md)).
_Avoid_: Background colour, band

**Star snapshot**:
The committed star counts the Star menu renders from, one number per repository plus the date they were read,
written by `bun run stars:update` and never fetched at request time.
_Avoid_: Live count, stars file

**Invariant**:
A property every built page must hold, checked after the build, so a page that breaks it cannot merge. The Page weight budget, the Program JavaScript budget and the Font budget are Invariants of the Site ([ADR 0005](docs/adr/0005-page-weight-and-web-font-budget.md)).
_Avoid_: Rule, assertion

**Crawler file**:
A built file a crawler reads at the assets root rather than a page: the Sitemap and the Robots file, both written by the build from the Language constants and judged by a built-file check.
_Avoid_: SEO file, metadata file, static asset

**Sitemap**:
The Crawler file at `/sitemap.xml`: one `<url>` per Language home, each naming every Language's alternate and `x-default` at the English home. It lists only the Site's homes and speaks for the whole host, so a Docs Portal sitemap later turns it into a sitemap index.
_Avoid_: URL list, page index

**Robots file**:
The Crawler file at `/robots.txt`: `User-agent: *`, `Allow: /` and the absolute `Sitemap:` line, with no `Disallow:`. It is read at the host root, so it speaks for `/docs` too, which another repository serves.
_Avoid_: Crawl rules, allowlist

**Pure Core**:
A module that takes data in and returns data out, with no clock, randomness, network or filesystem access. The built-file checks in `src/lib/build/`, the Crawler files' generators in `src/lib/crawl/` and the probe check in `src/lib/probe/` are Pure Cores; `scripts/` holds the adapters that read the build and start the Worker.
_Avoid_: Utility, helper, service

**Error Code**:
A stable code naming exactly one rule a built page can break, so one run reports every rule it breaks and no code changes meaning ([CODING_STANDARDS.md](CODING_STANDARDS.md)).
_Avoid_: Error message, failure string

**Social card**:
The Open Graph and X meta a share sheet renders for a page: its title, description, absolute URL, type, site name and card kind. The share image is not part of it, because no 1200×630 asset ships yet.
_Avoid_: Preview card, OG tags

**Structured data**:
The JSON-LD block a page carries, naming the `WebSite` and the `Organization` that publishes it. It is data, so it is outside the Program JavaScript budget ([ADR 0005](docs/adr/0005-page-weight-and-web-font-budget.md)).
_Avoid_: Schema, schema.org markup, metadata blob

**Page weight budget**:
The most one page's HTML and its same-origin stylesheets may gzip to together: under 50,000 bytes at zlib level 6, measured from the build ([ADR 0005](docs/adr/0005-page-weight-and-web-font-budget.md)).
_Avoid_: Size limit, bundle size

**Font budget**:
The most the distinct same-origin `.woff2` files one page's stylesheets reference may weigh: at most 48,000 bytes, uncompressed, each file once. The Brand Typeface costs 40,632 bytes of it ([ADR 0005](docs/adr/0005-page-weight-and-web-font-budget.md)).
_Avoid_: Font limit, type limit

**Program JavaScript**:
The script text one page runs, uncompressed and under 10,000 bytes: inline scripts, same-origin files in the static import graph, and script preloads, each once. JSON-LD is data, not Program JavaScript. [ADR 0004 (landing page redesign)](docs/adr/0004-landing-page-redesign.md) raised the budget from ADR 0005's 5,000 bytes.
_Avoid_: Bundle, JS payload

**Web font**:
A font file the Site serves itself under the Font budget: the Brand Typeface's three latin `.woff2` files (`Aleo` 300 and 400, `Azeret Mono` 500), copied from `@trajectonomics/design-system-assets` and declared in `src/styles/fonts.css`. A font URL that is absolute, a font or font stylesheet on another origin and a font in a `data:` URL each fail an Invariant, and the Site ships no Thai face, so Thai still draws from the visitor's own fonts ([ADR 0005](docs/adr/0005-page-weight-and-web-font-budget.md)).
_Avoid_: Custom font, typeface asset
