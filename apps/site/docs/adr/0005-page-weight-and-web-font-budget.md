---
status: accepted
---

# The built Site is held to a page weight and font budget

A visitor on a phone should not download more than a small page. The Site is static HTML and CSS with no framework runtime, no third-party script and three self-hosted latin faces, so its weight is a number this repository can hold. Before this record nothing in CI failed when that number grew: the shared check lints, typechecks, tests and builds, and the built-file step judged structure and colour, not bytes.

The numbers are the Site's own. The owner proposed them in site#6 and approved the Spec; they are not an organisation-wide budget, and `trajectonomics/cicd` stays unchanged. The rules run in the framework of [ADR 0004](./0004-build-output-checks.md): a pure core in `src/lib/build/` and an adapter that reads the build.

## Decision

Every built HTML page, including each Not-found page, satisfies all three rules.

**Page weight.** Gzip of the page's HTML at zlib level 6, plus gzip of each linked same-origin stylesheet at the same level, is strictly under 50,000 bytes. The figure is the sum of the separate gzip results, not one gzip of their concatenation. A stylesheet shared by two pages counts in full against each page. A same-origin CSS `@import` is followed and counted once per page. Inline style stays inside the HTML bytes.

**Program JavaScript.** The page's program JavaScript is strictly under 5,000 bytes, uncompressed. It is the text inside each program script, plus each same-origin file in the static import graph, plus each same-origin script preload, each file once. An inline program script counts toward the HTML figure and toward this figure; the `<script>` tags themselves are not added again. A script whose type is `application/ld+json` is data and is outside the figure.

**Font budget.** The distinct same-origin `.woff2` files a page's stylesheets reference sum to at most 48,000 bytes, uncompressed, each file counted once. Over the number fails `FONT_BUDGET_OVER`, and a referenced font the build did not produce fails `FONT_FILE_MISSING`. A font URL, or a remote `@import` that can declare one, fails `REMOTE_FONT_URL_PRESENT` when it is absolute or protocol-relative and `FONT_FROM_ANOTHER_ORIGIN` when its host is not the Site's; a font in a `data:` URL fails `DATA_FONT_URL_PRESENT`. The three faces are Aleo 300, Aleo 400 and Azeret Mono 500, 40,632 bytes together; body text keeps the Theme's system sans and Thai still draws from the visitor's own fonts.

A same-origin stylesheet or script a page names that the build did not produce fails with its own Error Code, so a broken link is not a silent pass.

The measurement reads the build output only. Bytes the router injects later are outside it. A missing build fails, and the existing Language-home and Not-found checks still require `/th/`, `/en/` and the Not-found documents in the build.

These rules are a Pure Core in `src/lib/build/`, taking the built files and returning failures, with no clock, randomness, network or filesystem access. `scripts/adapters/build-files.ts` reads `dist/` after the preview build, and `test/dist/site.test.ts` calls `checkBuild`, so `bun run check` is the gate and an empty build is not a pass. Every rule has its own Error Code, and one run reports every rule a page breaks.

## Considered Options

- **Put the budget in `trajectonomics/cicd` as an organisation standard.** Rejected. The numbers were proposed for this Site, and a shared budget would either be too loose for it or too tight for a repository that ships a framework.
- **Measure the HTML and CSS compressed together.** Rejected. The budget is the sum of the separate files' gzip sizes, so a stylesheet is not made cheaper by sitting next to the HTML in one stream.
- **Compress the JavaScript too.** Rejected. The uncompressed ceiling is what stops a framework runtime: a minifier or a compressor must not be able to hide it.
- **Run the weight check in its own workflow.** Rejected. The shared check already builds before its built-file step, so the budget belongs there; the browser-measured limits are a separate workflow (site#10).
- **Ship Inter for the body too.** Rejected. The Theme's system sans is the body face, and the Inter latin variable file alone is 48,256 bytes, more than the whole font budget. Aleo and Azeret Mono carry the brand's voice; Inter would only replace a face the visitor already has.
- **Self-host the faces without a budget.** Rejected. A font is a download on the critical path, so allowing one must buy a number the build checks, not a licence to grow.

## Amendment (site#33, the restyle)

The restyle ([ADR 0007](./0007-landing-page-restyle-twenty-language.md)) moves the page's type onto
`@trajectonomics/design-system-theme/typography.css` and names its two families in `src/styles/global.css`
(`--font-display` and `--font-meta`). Nothing here changes yet: the families are still the visitor's own fonts,
no font file, `@font-face` rule, remote URL or `data:` URL joins the build, and all four Error Codes stand.

When [design-system#77](https://github.com/trajectonomics/design-system/issues/77) ships the display and mono
files, this record's "no web font" rule becomes a font budget — one number and one Error Code per rule, in the
same framework — and that is a new record, not an edit to the numbers above. The restyle leaves the change to
those two lines so the budget lands in one file.

## Amendment (the Brand Typeface)

`@trajectonomics/design-system-assets@0.1.0-alpha.4` ships the Brand Typeface
([design-system#77](https://github.com/trajectonomics/design-system/issues/77)): `aleo-latin-300.woff2`
(14,900 B), `aleo-latin-400.woff2` (14,848 B) and `azeret-mono-latin-500.woff2` (10,884 B), the latin subsets,
SIL OFL 1.1. The Site now draws its display and meta type with them. `scripts/copy-fonts.ts` copies the three
into `public/fonts/` before every build — the binaries stay out of the repository — and `src/styles/fonts.css`
declares only those three faces, with the package's metric-matched `"Aleo Fallback"` and `"Azeret Mono Fallback"`
families, `font-display: swap` and the latin `unicode-range`. `src/styles/global.css` names them in
`--font-display`, `--font-meta` and `--font-mono`.

The "No web font" rule above is replaced by the Font budget in **Decision**, and `checkFonts` in
`src/lib/build/fonts.ts` is the rule. The number is 48,000 bytes a page, uncompressed, over the distinct
same-origin `.woff2` files the page's stylesheets reference. The three faces cost **40,632 bytes**: 29,748 bytes
of Aleo for the headline at weights 300 and 400, and 10,884 bytes of Azeret Mono for the 11–12 px uppercase
meta. That is the price of the look: Aleo's calligraphic contrast is the headline's voice and no system serif
has it, and the mono meta layer is half of the twenty.com language ([ADR 0007](./0007-landing-page-restyle-twenty-language.md));
Georgia and `ui-monospace` were the placeholder this replaces. The 7,368 bytes of headroom re-subset or replace
a file, but they do not admit a fourth face — the Inter latin variable file alone is 48,256 bytes, which is why
the body stays the Theme's system sans.

Every page's stylesheet references all three faces, so the budget is measured against 40,632 bytes even where a
weight is unused, and `FONT_BUDGET_OVER` fails one byte above 48,000. Thai is not in the ranges, so no Thai file
ships and Thai glyphs still fall through to the visitor's own face.

## Consequences

- The build is judged with the structural rules in [ADR 0004](./0004-build-output-checks.md); this record adds the byte rules, and a new rule is still one file, one Error Code and one fixture test.
- Raising a number, adding a page rule or allowing a font is an ADR change, not a configuration edit.
- A new page, a new stylesheet or a new script is measured automatically; the two Not-found pages are pages like any other.
- The three faces download once and stay cached; `font-display: swap` and the metric-matched fallbacks keep the first paint from waiting for them.
- The browser-measured limits — axe, keyboard, language and Lighthouse mobile performance — are recorded with the browser workflow (site#10), not here.
