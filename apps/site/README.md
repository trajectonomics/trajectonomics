# Trajectonomics Site

The Site at the root of [trajectonomics.com](https://trajectonomics.com): static [Astro](https://astro.build) built with Bun and Tailwind, served by a Worker with Static Assets. `trajectonomics/web-router` mounts it at `/` and sends `/docs` to the Docs Portal.

This repository is private and never published to npm. The Worker is named `site` and takes no route of its own; the router attaches the public one ([ADR 0002](./docs/adr/0002-site-worker-with-static-assets.md)).

## Develop

```bash
bun install
bun run dev
```

## Scripts

| Script | Does |
| --- | --- |
| `bun run dev` | Astro dev server on a local port |
| `bun run build` | Build the Site into `dist/` as a production build |
| `bun run build:preview` | Build into `dist/` with Astro mode `preview`, the build `bun run check` scans |
| `bun run verify:build` | Scan `dist/` with `bun test`: a home per Language and a Not-found page per Locale URL, one `h1` and at most one `h2` inside `main` with no deeper heading, `main`, `nav` and `head` each, the Docs and skills links, the `hreflang` pair, the localized title, description and social card on each home, `theme-color` per published Theme, one JSON-LD block, none of it on a miss, the four regions and the surface each one paints, the install command, no document at `/`, no absolute asset, the switcher, `noindex` on misses, the page weight, script and font budgets, no Reserved preload path, no content security policy, no `npx traj`, and in production mode no `[OWNER TO WRITE]` |
| `bun run stars:update` | Read the Organisation's repositories with `gh api` and rewrite the committed `src/lib/site/stars.json` snapshot the Star menu renders from |
| `bun run probe:status` | Start `wrangler dev` with no Cloudflare credential and check `/` redirects by Visitor signal, both Locale URLs are 200, a miss under a Locale URL is 404 in that Language, and `/__mf-preload.js` is 404 |
| `bun run test` | `bun test` over `src` and `scripts` |
| `bun run test:browser` | Build, then run Playwright: axe in both Themes on both Language homes and the real Not-found response, Tab and the focus ring, the Copy announcement, and the page with JavaScript off |
| `bun run test:performance` | Build, then run mobile Lighthouse three times against the local Worker for each Language home and require a median of 0.95 or more |
| `bun run typecheck` | `tsc` plus `astro check` |
| `bun run lint` | Biome, warnings as errors |
| `bun run format` | Rewrite formatting and import order |
| `bun run check` | Lint, typecheck, test, the preview build, the built-file scan in preview mode, `probe:status` |
| `bun run skills:check` | Verify installed agent skills against `skills-lock.json` |
| `bun run skills:update` | Update installed agent skills |

## The build

`dist/th/index.html` and `dist/en/index.html` are the two Language homes, and there is no document at `/`: the Worker's only script answers `/` with a 302 to the chosen Locale URL ([ADR 0003](./docs/adr/0003-thai-and-english-from-visitor-signals.md)). Each home's head carries the owner's localized title and description, a complete Open Graph and X card, one `theme-color` per published Theme read from the pinned Theme tokens, and one JSON-LD block naming the `WebSite` and its `Organization`; a miss carries none of it. `dist/404.html` is the English Not-found page, `dist/th/404.html` the Thai one and `dist/en/404.html` the English one under its own Locale URL, so the assets handler's nearest-`404.html` rule answers a miss in the Language of the Locale URL the visitor tried. The built files are the source of truth for the structure rules, not HTML fetched through the router.

The page shows the header, the hero with the install command, one section below it that explains the product's two parts, and the footer ([site#3](https://github.com/trajectonomics/site/issues/3), [site#24](https://github.com/trajectonomics/site/issues/24)). The header carries one Star menu and one Language menu, both native `<details>` disclosures that work with JavaScript off; the Star menu's trigger is a star and the name of the repository with the most stars in the committed snapshot, and its panel lists the repositories above `All repositories`, none of them checked ([ADR 0007](./docs/adr/0007-landing-page-restyle-twenty-language.md)). The hero's copy is the owner's, in both Languages ([site#7](https://github.com/trajectonomics/site/issues/7)): the headline reads one phrase per script step and then holds its last line, and with JavaScript off or `prefers-reduced-motion: reduce` it shows that held line alone. The primitives the page is built from are Astro components in `src/components/ui/` with `data-slot` attributes and variants, and every colour they paint is a Semantic Token Role. The page keeps one `h1` and at most one `h2`, both inside `main`, and no deeper heading ([ADR 0006](./docs/adr/0006-page-headings.md)). Screenshots of the built page are in [`docs/screenshots/`](./docs/screenshots/). Deployment is a later change.

The built-file rules are a pure core in `src/lib/build/`, and the scan is `bun test ./test/dist`, which `bun run check` runs after `astro build --mode preview` with `SITE_BUILD_MODE=preview`. A scan named with no mode judges a production build, so a production `dist/` that still holds `[OWNER TO WRITE]` fails instead of shipping. [ADR 0004](./docs/adr/0004-build-output-checks.md) records the design.

## Browser checks

`.github/workflows/browser.yml` runs the checks a browser is needed for: axe with the WCAG 2.2 AA tags in both Themes on `/th/`, `/en/` and the real 404 response, the keyboard and Language checks, the page with JavaScript off, the headline's cycle and its reduced-motion fallback, and the mobile Lighthouse budget ([ADR 0005](./docs/adr/0005-page-weight-and-web-font-budget.md)). It serves the build with `wrangler dev`, which is why it is a separate workflow with a 15 minute limit and why the three shared CI callers stay one job with no steps.

## License

[MIT](./LICENSE)
