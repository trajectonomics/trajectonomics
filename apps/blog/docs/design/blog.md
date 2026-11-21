# Design brief: the blog

The brief every blog page is styled against. Words are in [`GLOSSARY.md`](../../GLOSSARY.md); the
decisions behind the shell are in [ADR 0002](../adr/0002-the-blog-is-static-on-its-own-host.md).
A later Compare Page is a content change against this brief, not a redesign.

## Reference and traits

The blog invents no look of its own. It keeps the design system (the Theme roles, the brand assets,
the 4 px controls) and the Site's twenty.com language: flat panels, hairlines, mono meta labels, one
accent, the bevelled button and the dark footer. Each reference below lends one trait to one part.
Links only: no third-party screen is committed.

| Part | Reference | Trait to copy |
| --- | --- | --- |
| Page structure | [openbot.run compare page](https://openbot.run/compare/claude-code-vs-antigravity) | the section order, and the verdict before the detail |
| Comparison table | [Twenty](https://mobbin.com/sites/sections/6687a6a1-ce86-4400-adf3-5ad04bda2ee0) | grouped section headers, hairline-ruled columns |
| Comparison table | [Humble](https://mobbin.com/sites/sections/1fec47d5-1742-48f1-a207-e43f3d5c2d37) | one highlighted column for the better side |
| Two-product header | [Apple](https://mobbin.com/screens/b66a072d-bc5b-4c51-b5a8-f5c7f88b3e18) | two products side by side, spec rows under hairlines |
| FAQ | [Tempo](https://mobbin.com/sites/sections/9d16d396-81e9-405c-8d21-2206dccd2e51) | numbered `01:` rows divided by hairlines |
| FAQ | [Monarch](https://mobbin.com/sites/sections/3cabb3ff-0d83-4109-9afe-7e4de8b272fc) | plain stacked questions in a finance competitor's tone |
| Related posts | [Zendesk](https://mobbin.com/sites/sections/624330e1-b370-46c8-ae0d-fb6faf41183d) | the `ARTICLE \| 5 MIN READ` meta line |
| Article column | [Substack](https://mobbin.com/screens/6216f399-dd2f-4796-9771-e6793a994d09) | a narrow reading column with a byline |
| Tone | [twenty.com compare-pricing](https://twenty.com/compare-pricing/hubspot), [YNAB vs Monarch](https://www.ynab.com/blog/ynab-vs-monarch) | a worked cost example, and a fair-play note inviting corrections |

## Shell

| Part | Decision |
| --- | --- |
| Header | Sticky, 64 px, the background role with a hairline under it and no shadow. Left: the brand mark on a tile painted from the primary roles (32 px, 40 px from 640 px up), linking to the Site Home `https://trajectonomics.com/`, then the `Blog` marker in the display face linking to `/`, marked `aria-current="page"` on the front page. Right: `Docs`, a mono 11 px uppercase link to `https://docs.trajectonomics.com/`. The Language menu joins it with the Language and SEO ticket. |
| Footer | The stage roles in both Themes: the organisation's name in the display face and the tagline, beside three link columns (Read, Source, Help) under mono labels, then the licence line under a hairline. |
| Width | Content is capped at 72 rem with a 20 px gutter, 24 px from 640 px up. |
| Type | Headlines in Aleo 300, tight tracking. Meta labels in Azeret Mono 500, 11 px, uppercase, tracked 0.08 em. Body text in the Theme's sans stack, which carries the Thai fallback. |
| Look | The brand's light and dark Themes (`@trajectonomics/brand/current/{light,dark}.css`), selected by `data-theme` on `<html>`. Both follow the device: an inline script reads `prefers-color-scheme` and follows its changes, `light` holds with JavaScript off, and there is no toggle and no stored choice. No colour literal anywhere: the browser's `theme-color` is read from each Theme's background role at build time. |
| Images | A Post's cover and figures are WebP files under `public/posts/<slug>/`, at most 1600 px wide, with their width and height stated so nothing shifts as they load. Illustrations follow the cover's look: soft matte cream robots with orange eyes, wood-grain dunes, a dark sky and a low orange sun. No words or numbers are drawn into an image. |
| Controls | The bevelled button: a 4 px radius with the bottom-right corner cut to 16 px where `corner-shape` is supported. Focus is a 2 px ring on the ring role at a 4 px offset. |

## Page sections

| Page | Sections |
| --- | --- |
| Front page `/` | A masthead (mono label, display headline, one-line lede), then `Latest` over a hairline: the newest Post featured with its cover beside its meta line, title and description, then the rest as newest-first rows. With no Post, one line says so. The landing-list ticket adds the type filter. |
| Post `/<type folder>/<slug>/` | A 42 rem reading column. The meta line (type, date, reading time), the display title, the description as a lede and the byline. Then the cover, a little wider than the column, then the Markdown body: display-face `h2`s, code on the secondary surface, figures with captions. It ends with a fair-play line inviting corrections. |
| Compare Page | Not built yet. In the reference's order: two-subject header with spec rows under hairlines, the comparison table with one highlighted column, the Verdict, by the numbers with a worked cost example, how we tested, the FAQ, sources with a fair-play note, related posts, and a byline with reading time. |
| Not-found page | The masthead's shape: `404`, "This page is not here", one line, then the bevelled `All posts` button and a `Site Home` link. `noindex`. |

## Surface states

| State | Behaviour |
| --- | --- |
| Empty | A section with nothing in it says so in one line, over a hairline, instead of disappearing. |
| Loading | None: every page is static HTML. |
| Error | A miss answers 404 with the Not-found Page inside the Shell. |
| Mobile (390 px) | One column. The footer's columns become a two-column grid. |
| JavaScript off | Every page reads and links in full; the light Theme holds. |

## Assets

All from `@trajectonomics/brand/current/`, copied into `public/` before every build by
`scripts/copy-brand-assets.ts`: the mark (inlined), the three latin font files the Site uses, and
the Favicon Set. A Post's images are the blog's own, under `public/posts/<slug>/`, and its cover is
its share image.

## Checking a change

`bun run check` runs lint, typecheck, tests, the build and `verify:build`, which fails a page with no
title, an indexable page with no canonical, a page outside the Shell (no Site Home link, no blog
link, no footer), an image the build lacks or that has no alt text, and a build with no Not-found
Page. A test fails any colour literal in a stylesheet or a
component. Layout is checked by screenshots: `bun run screenshots` writes `docs/screenshots/<theme>/`
at 1280, 2000 and 390 px for every page, and a Surface ticket's pull request commits them and merges
only on the owner's approval.
