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

**Invariant**:
A property every built page must hold, checked after the build, so a page that breaks it cannot merge. The Page weight budget, the Program JavaScript budget and the absence of a Web font are Invariants of the Site ([ADR 0005](docs/adr/0005-page-weight-and-web-font-budget.md)).
_Avoid_: Rule, assertion

**Pure Core**:
A module that takes data in and returns data out, with no clock, randomness, network or filesystem access. The built-file checks in `src/lib/build/` and the probe check in `src/lib/probe/` are Pure Cores; `scripts/` holds the adapters that read the build and start the Worker.
_Avoid_: Utility, helper, service

**Error Code**:
A stable code naming exactly one rule a built page can break, so one run reports every rule it breaks and no code changes meaning ([CODING_STANDARDS.md](CODING_STANDARDS.md)).
_Avoid_: Error message, failure string

**Page weight budget**:
The most one page's HTML and its same-origin stylesheets may gzip to together: under 50,000 bytes at zlib level 6, measured from the build ([ADR 0005](docs/adr/0005-page-weight-and-web-font-budget.md)).
_Avoid_: Size limit, bundle size

**Program JavaScript**:
The script text one page runs, uncompressed and under 10,000 bytes: inline scripts, same-origin files in the static import graph, and script preloads, each once. JSON-LD is data, not Program JavaScript. [ADR 0004 (landing page redesign)](docs/adr/0004-landing-page-redesign.md) raised the budget from ADR 0005's 5,000 bytes.
_Avoid_: Bundle, JS payload

**Web font**:
A font the Site downloads instead of drawing with the visitor's own fonts. A font file, an `@font-face` rule, a remote font URL and a `data:` font URL are each forbidden.
_Avoid_: Custom font, typeface asset
