# Site

The public pages at the root of trajectonomics.com, in Thai and English: the home at `/` and OpenJot's page at `/openjot/`, served by the `site` Worker's apex Custom Domain. The Docs Portal is `/docs/`, the blog `/blog/` and the data site `/data/`, each mounted by a zone route on another Worker ([ADR 0033](docs/adr/0033-one-host-serves-the-site-docs-blog-and-data.md)).

## Language

**Site**:
This repository's static microfrontend, the page at `/` of trajectonomics.com.
_Avoid_: Landing page, home page, marketing site

**Language**:
Thai (`th`) or English (`en`), the two native languages of the Site. English is the fallback.
_Avoid_: Translation, copy, tongue

**Skill**:
A package of instructions a coding agent follows, installed into that agent rather than imported by a program. traj ships as one.
_Avoid_: Plugin, extension, package

**Onboarding skill**:
The Skill `traj-onboarding`, the one the Site's prompt route hands to a visitor's agent: it asks about the visitor's money, sets up the traj CLI, installs the operating skill, and starts them off.
_Avoid_: Setup skill, getting-started skill

**Presentation layer**:
What the visitor's agent owns on the home: how the answer comes back — as an answer in the visitor's words, an interactive chart, or an action in an app the visitor already uses — in the visitor's language. The agent draws it any way it likes, so the home draws it dashed.
_Avoid_: Frontend, UI, interface

**Logic layer**:
What the traj CLI owns: the arithmetic, tax and projections. Same input, same answer; it never calls a model. The agent reaches it only through a Skill.
_Avoid_: Backend, engine, server

**CLI**:
The `traj` command-line program (`@trajectonomics/cli`) that does the arithmetic: same input, same answer, every time, and it never calls a model.
_Avoid_: Binary, tool, executable

**Install path**:
One way a visitor gets traj onto their machine: the Site's Prompt route, which hands the Onboarding skill to the visitor's agent, or the Docs Portal's CLI installation page, which lists the CLI's install channels. The Site prints no command; it prints the prompt and names the Docs Portal for the other.
_Avoid_: Install method, installer, setup path

**Prompt route**:
The CTA's one action: a single sentence, copied into a coding agent by the CTA's Copy control, that names the published Onboarding skill by its raw URL rather than quoting a command, so the commands stay in the Skill that owns and versions them. It serves the visitor who has no terminal but whose agent does; the sentence ships in the page but is not printed beside the two CTA controls ([ADR 0015](docs/adr/0015-the-window-prints-a-prompt-and-no-command.md), amendment of 2026-11-19).
_Avoid_: Prompt command, paste command, copy command

**Stable release**:
A release the owner names as no longer alpha. The first was `v0.1.0`, on 2026-11-12, for both the CLI and the Onboarding skill; from the CLI's `v0.2.0` the Site names the CLI's stable release with its version and date, and the Onboarding skill publishes continuously from `main`, so it carries no version on the Site.
_Avoid_: GA, production release, 1.0

**Language home**:
The page a Language's build writes. English's home is the Site's one address, `/`; Thai's home is written to its Language build path and reaches a visitor at `/` through the Worker.
_Avoid_: Language page, variant

**Clean URL**:
The one address a page is served at, `https://trajectonomics.com/` for the home and
`https://trajectonomics.com/openjot/` for OpenJot, with no Language segment. It is what a visitor
copies, and what the canonical, the `x-default` alternate, the Sitemap and the Answer engine files
name.
_Avoid_: Bare URL, root URL, landing URL

**Page address**:
One of the paths the Site's Worker answers itself: `/` or `/openjot/`. Each pairs the address with
the function that resolves its built file for a Language, and each is answered in the resolved
Language with the same cache and consent contract.
_Avoid_: Route, page path, mount

**OpenJot page**:
OpenJot's landing page on the Site, at `/openjot/` ([ADR 0032](docs/adr/0032-the-site-serves-openjot-at-openjot.md)).
It is built at `openjot/` and `th/openjot/`, served at one address by the Worker, and its download
leaves for the OpenJot Worker's `/download` short link.
_Avoid_: App page, OpenJot site, second landing page

**Language build path**:
The path a Language's home is written to in the build: `/` for English, `th/` for Thai. It is not an address: the Worker serves Thai at `/`, and `/th` answers 301.
_Avoid_: Locale URL, language prefix, translated URL

**Language choice**:
The Language a visitor picked in the Language menu, readable before any page script runs. It is stored in the first-party cookie `traj_lang`, with `Path=/` so every app under the origin reads the same one, and only an explicit choice writes it.
_Avoid_: Preference, language setting, locale cookie

**Language choice link**:
The link `/?lang=<code>` a Language menu entry points at. The Worker answers it by writing the Language choice and replying 302 to `/`, so the menu switches and remembers with JavaScript off.
_Avoid_: Language switch URL, setter endpoint

**Visitor signal**:
The `Accept-Language` header, otherwise the `cf-ipcountry` header, read only to resolve the Language `/` is answered in, after the Language choice. Not the HTTP `Origin` header.
_Avoid_: Origin, geolocation

**Dictionary**:
The strings for one Language. Every Language has the same keys.
_Avoid_: Translation file, messages, catalog

**Worker with Static Assets**:
The Site's Worker that serves the built files. Its script answers each page address in the resolved
Language, stores the Language choice when a visitor picks one, redirects the old per-Language
prefixes to `/`, and hands every other path to the assets binding.
_Avoid_: Assets Worker, site server, hosting

**Not-found page**:
The built page served with HTTP status 404 when a path is not in the Site. There is one, in English: a miss is answered outside every Language build path.
_Avoid_: soft 404, error page

**Reserved preload path**:
The path `/__mf-preload.js`, which no Worker on the host serves and the Site never builds.
_Avoid_: preload script, client router

**Reserved mount path**:
A path a zone route gives another Worker on the Site's host (`/docs`, `/blog`, `/data`), so the Site never builds a file there ([ADR 0033](docs/adr/0033-one-host-serves-the-site-docs-blog-and-data.md)).
_Avoid_: excluded directory, ignored path

## Consent

**Consent**:
The visitor's answer to the cookie banner, `granted` or `denied`, stored in `traj_consent` for 180 days. A browser that sends `Sec-GPC` or `DNT` is a `denied`, and a visitor who has not answered is `undecided`.
_Avoid_: Cookie setting, opt-in

**Visitor id**:
The random UUID in `traj_vid` that a `granted` visitor carries, which the Worker writes into the home and the analytics uses as `distinct_id`. It is set only with consent ([ADR 0024](./docs/adr/0024-the-site-asks-before-it-sets-an-analytics-cookie.md)).
_Avoid_: User id, account id

## Built site

**Theme**:
The published colour set a page asks for with `data-theme`, one value per Semantic Token Role. A production build ships one, dark, for every visitor: it never follows the device's scheme. Every other build ships both and follows the device, so the light Theme stays capturable and cannot rot while it is deferred ([ADR 0016](docs/adr/0016-the-site-ships-the-dark-theme.md)).
_Avoid_: Colour scheme, dark mode, colour mode

**Surface**:
A published Semantic Token Role a landmark paints behind its content, and the text role that belongs on it:
`background`/`foreground`, `muted`/`foreground`, `stage`/`stage-foreground` ([ADR 0008](docs/adr/0008-landmark-surface-roles.md)).
_Avoid_: Background colour, band

**Mascot**:
The cream robot with a dark visor, orange eyes and an orange-tipped antenna, the character the blog's covers draw. On the Site it is eleven poses, each a Gemini render cut out of a green screen into a transparent WebP, and a twelfth, `point`, a transparent PNG that stands on the home share card pointing at its answer ([ADR 0036](docs/adr/0036-the-home-share-card-shows-the-answer.md)). It peeks over the hero's live window. It holds a chart beside the Features heading, and each of the four small Features cards has its own pose that acts out the feature, each in a different place ([ADR 0028](docs/adr/0028-the-cookie-card-sits-in-the-corner-and-each-small-feature-has-its-robot.md), [ADR 0029](docs/adr/0029-each-small-feature-card-puts-its-robot-somewhere-else.md)). It thinks beside the FAQ heading, waves above the closing call to action, sits in the footer, and is lost on the Not-found page. The home places it so a phone always has one on screen ([ADR 0027](docs/adr/0027-a-phone-always-has-the-mascot-on-screen.md)). It is decoration, with an empty `alt`, and still under reduced motion ([ADR 0025](docs/adr/0025-the-page-carries-the-mascot.md), [ADR 0026](docs/adr/0026-the-mascot-is-a-rendered-cut-out.md)).
_Avoid_: Bot icon, logo, avatar

**Star snapshot**:
The committed star count of the Site's one repository, plus the date it was read,
written by `bun run stars:update` and never fetched at request time. The deploy workflow runs that script
before it builds the Site, and runs daily, so the printed count is at most a day old; the committed file is
the fallback when GitHub cannot be read.
_Avoid_: Live count, stars file

**Release snapshot**:
The committed release facts the Site prints: the CLI's stable version, its release date as an ISO date, and the date they were read,
written by `bun run release:update` from npm's `latest` and the GitHub release of that tag, and never fetched at build or request time.
Every page's version and date come from it, so a release is one command and no edit to a Dictionary.
_Avoid_: Version file, release config, changelog

**Invariant**:
A property every built page must hold, checked after the build, so a page that breaks it cannot merge. The Page weight budget, the Program JavaScript budget and the Font budget are Invariants of the Site ([ADR 0005](docs/adr/0005-page-weight-and-web-font-budget.md)).
_Avoid_: Rule, assertion

**Crawler file**:
A built file a crawler reads at the assets root rather than a page: the Sitemap and the Robots file, both written by the build from the Language constants and judged by a built-file check.
_Avoid_: SEO file, metadata file, static asset

**Sitemap**:
The Crawler file at `/sitemap.xml`: one `<url>` per page address, each naming `x-default` at that
same address, which is also what the IndexNow payload submits. It lists only the Site's addresses.
The Docs Portal publishes its own at `https://trajectonomics.com/docs/sitemap.xml` and the blog at
`https://trajectonomics.com/blog/sitemap.xml`, and the Robots file names all three.
_Avoid_: URL list, page index

**Robots file**:
The Crawler file at `/robots.txt`: `User-agent: *`, `Allow: /`, one `Allow: /` group per named answer engine, and the absolute `Sitemap:` lines for the Site, the Docs Portal and the blog, with no `Disallow:`. It describes the whole host. `/docs`, `/blog` and `/data` stay allowed because zone routes mount other Workers there, and the file cannot speak for one path without naming the others too ([ADR 0017](docs/adr/0017-crawlers-and-answer-engines-read-the-same-facts.md), [ADR 0033](docs/adr/0033-one-host-serves-the-site-docs-blog-and-data.md)).
_Avoid_: Crawl rules, allowlist

**Answer engine file**:
A file an answer engine reads instead of the HTML: `/llms.txt`, the Site's name, its one-line summary and its links in the llmstxt.org shape, and `/llms-full.txt`, the Site's words in the fallback Language rendered as Markdown, including the two demo transcripts the page no longer plays and the JSON answer they end on. Both are generated from the Dictionary before every build and judged by a built-file check; neither is committed ([ADR 0017](docs/adr/0017-crawlers-and-answer-engines-read-the-same-facts.md)).
_Avoid_: llm file, AI sitemap, RAG index

**IndexNow key**:
The 32-hex string committed as `public/<key>.txt` and served at the Site's root, which names the host to IndexNow and signs nothing, so it is public by design. `bun run indexnow` fetches it from the live Site before it submits the Sitemap's URLs, and no workflow runs that command ([ADR 0017](docs/adr/0017-crawlers-and-answer-engines-read-the-same-facts.md)).
_Avoid_: API key, index token

**Pure Core**:
A module that takes data in and returns data out, with no clock, randomness, network or filesystem access. The built-file checks in `src/lib/build/`, the Crawler files' generators in `src/lib/crawl/` and the probe check in `src/lib/probe/` are Pure Cores; `scripts/` holds the adapters that read the build and start the Worker.
_Avoid_: Utility, helper, service

**Error Code**:
A stable code naming exactly one rule a built page can break, so one run reports every rule it breaks and no code changes meaning ([CODING_STANDARDS.md](CODING_STANDARDS.md)).
_Avoid_: Error message, failure string

**Social card**:
The Open Graph and X meta a share sheet renders for a page: its title, description, absolute URL, type, site name, the Share image it advertises, the Language it states as `og:locale` with the other as `og:locale:alternate`, and the card kind that names the picture (`summary_large_image`).
_Avoid_: Preview card, OG tags

**Share image**:
The 1200 × 630 PNG a page advertises as `og:image`, painted in the shipped Theme's colours and
written to `public/og/<name>.png` by `scripts/share-image.ts` before every build (`<language>.png`
for a home, `openjot-<language>.png` for OpenJot). A home's card shows the answer as a picture: the
Language's question above a net-worth line, grey while working and orange once free to stop, with the
FI date written on the curve, and the Mascot standing at its right pointing back at it; OpenJot's card keeps the page's one-line summary. It is generated and
never committed, and it is no page subresource, so no page budget counts it
([ADR 0018](docs/adr/0018-the-share-image-is-generated-at-build-time.md),
[ADR 0036](docs/adr/0036-the-home-share-card-shows-the-answer.md)).
_Avoid_: OG image, thumbnail, preview picture

**Structured data**:
The JSON-LD block a page carries, naming the `WebSite` (on a Language home, the brand's name with
`traj` as its alternate name; on the OpenJot page, OpenJot), the `Organization` that publishes it with its `logo` and `sameAs`, and traj as a
free `SoftwareApplication` on the home or OpenJot as a `MobileApplication`. It states only what the
page or the repository states, and never a rating, so it is data and outside the Program JavaScript
budget ([ADR 0005](docs/adr/0005-page-weight-and-web-font-budget.md),
[ADR 0017](docs/adr/0017-crawlers-and-answer-engines-read-the-same-facts.md)).
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

**Live window**:
The hero's window, which is the Hosted Demo itself in an iframe rather than a picture: its bar carries the window dots, the Dashboard's title, browser-style zoom, and the way out to `/demo/` ([ADR 0035](docs/adr/0035-the-hero-is-the-live-demo.md)). At zoom `z` the frame lays out at `1/z` of the visible box and is scaled by `z`, from 50% to 125%, and the controls ship disabled so a page with no script offers no zoom that cannot work. Nothing about the zoom is stored.
_Avoid_: Demo window, chat widget, mock app, dashboard route

**Hosted Demo**:
The Dashboard's read-only build, `apps/web/dist-hosted/`, copied whole to `/demo/` by the Site's build and served as static assets, with a Content-Security-Policy scoped to `/demo/*` ([ADR 0031](docs/adr/0031-the-site-serves-the-hosted-demo-with-a-scoped-csp.md)). The hero's Live window embeds it. It is not a route: Workers Static Assets serves each file. No Demo page or asset is committed.
_Avoid_: Live demo, hosted app, dashboard route

**Web font**:
A font file the Site serves itself under the Font budget: the Brand Typeface's three latin `.woff2` files (`Aleo` 300 and 400, `Azeret Mono` 500), copied from `@trajectonomics/brand/current/fonts/` and declared in `src/styles/fonts.css`. A font URL that is absolute, a font or font stylesheet on another origin and a font in a `data:` URL each fail an Invariant, and the Site ships no Thai face, so Thai still draws from the visitor's own fonts ([ADR 0005](docs/adr/0005-page-weight-and-web-font-budget.md)).
_Avoid_: Custom font, typeface asset
