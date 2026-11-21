---
status: accepted
---

# The landing page is redesigned in a black-and-white direction inspired by twenty.com

The Language homes (`/en/`, `/th/`) keep their structure — one `header`, one `main` with one hero `h1`, one `footer`, no other headings — and their content, but the whole page is redesigned: header, hero and footer, in both Languages, in both Themes.

## Decision

- **Direction.** A black-and-white base (the published neutral roles) with one kicker colour, inspired by twenty.com's landing page. The kicker is the published `destructive` red until the design system ships an orange `accent` ([trajectonomics/design-system#59](https://github.com/trajectonomics/design-system/issues/59)). No colour literal is ever written in the Site: the colour-literal check stays.
- **Motion.** CSS animation first (keyframes, transitions, scroll-driven `animation-timeline` where supported), plus one small JavaScript reveal layer. `prefers-reduced-motion: reduce` disables all of it. The program JavaScript budget rises from 5,000 to 10,000 bytes (`PROGRAM_JAVASCRIPT_BUDGET_BYTES`); the Lighthouse mobile median of 0.95 in `browser.yml` remains the hard gate, so the budget is headroom, not a target.
- **Headline.** The hero `h1` splits into a static prefix and rotating suffixes: `heroHeadingPrefix` plus `heroHeadingCycle`, the last suffix held when no script runs. Only the suffix changes when the cycle steps, so the prefix never reflows. Copy gets shorter, in both Languages, in Dictionary parity.
- **Svelte.** Allowed, build-time only: components render to static HTML at build time with no `client:*` hydration, so the shipped artifact stays static HTML and CSS ([ADR 0002](./0002-site-worker-with-static-assets.md)). Client-side islands would ship JavaScript and are rejected.
- **Content.** No new sections: the landmarks check's one-`h1`-and-no-other-headings rule stays. The install command, the Copy button, the Docs and skills links, the switcher and the footer disclaimer all stay exactly where their checks require.

## Considered Options

- **A brand accent colour in the Site.** Rejected. The published themes ship neutral `accent` and red `destructive` only, and the colour-literal check forbids raw values in consumer code; an orange kicker is a `theme` package change (design-system#59), not a Site change.
- **JavaScript-heavy animation like the inspiration.** Rejected for now. The 5,000-byte budget and the Lighthouse 0.95 gate make CSS-first the only sustainable default; the budget rises to 10,000 bytes to leave room for one JS reveal layer, not for a framework.
- **New sections with their own headings.** Rejected. The hero makes the page's one claim; sections would need the landmarks rule changed, which is a separate decision.
- **Client-side Svelte islands.** Rejected. They would ship JavaScript and contradict ADR 0002's static artifact.

## Consequences

- The Dictionary shape changes (`heroHeading` + `heroHeadingCycle` of full sentences becomes `heroHeadingPrefix` + `heroHeadingCycle` of suffixes); the page-text check and its fixtures follow the new shape, in both Languages.
- `PROGRAM_JAVASCRIPT_BUDGET_BYTES` becomes 10,000; the page-weight check and its tests follow.
- The redesign is chosen from prototype variants rendered in a browser, recorded in the spec doc under `docs/`, before implementation.
- When design-system#59 lands, the kicker switches from `destructive` to `accent` by changing utility names only.
