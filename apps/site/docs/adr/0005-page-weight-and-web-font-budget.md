---
status: accepted
---

# The built Site is held to a page weight and web font budget

A visitor on a phone should not download more than a small page. The Site is static HTML and CSS with no framework runtime, no third-party script and no web font, so its weight is a number this repository can hold. Before this record nothing in CI failed when that number grew: the shared check lints, typechecks, tests and builds, and the built-file step judged structure and colour, not bytes.

The numbers are the Site's own. The owner proposed them in site#6 and approved the Spec; they are not an organisation-wide budget, and `trajectonomics/cicd` stays unchanged. The rules run in the framework of [ADR 0004](./0004-build-output-checks.md): a pure core in `src/lib/build/` and an adapter that reads the build.

## Decision

Every built HTML page, including each Not-found page, satisfies all three rules.

**Page weight.** Gzip of the page's HTML at zlib level 6, plus gzip of each linked same-origin stylesheet at the same level, is strictly under 50,000 bytes. The figure is the sum of the separate gzip results, not one gzip of their concatenation. A stylesheet shared by two pages counts in full against each page. A same-origin CSS `@import` is followed and counted once per page. Inline style stays inside the HTML bytes.

**Program JavaScript.** The page's program JavaScript is strictly under 5,000 bytes, uncompressed. It is the text inside each program script, plus each same-origin file in the static import graph, plus each same-origin script preload, each file once. An inline program script counts toward the HTML figure and toward this figure; the `<script>` tags themselves are not added again. A script whose type is `application/ld+json` is data and is outside the figure.

**No web font.** A font file, an `@font-face` rule, a remote font URL, and a `data:` font URL each fail with their own Error Code. The Site draws Thai from the visitor's own fonts.

A same-origin stylesheet or script a page names that the build did not produce fails with its own Error Code, so a broken link is not a silent pass.

The measurement reads the build output only. Bytes the router injects later are outside it. A missing build fails, and the existing Language-home and Not-found checks still require `/th/`, `/en/` and the Not-found documents in the build.

These rules are a Pure Core in `src/lib/build/`, taking the built files and returning failures, with no clock, randomness, network or filesystem access. `scripts/adapters/build-files.ts` reads `dist/` after the preview build, and `test/dist/site.test.ts` calls `checkBuild`, so `bun run check` is the gate and an empty build is not a pass. Every rule has its own Error Code, and one run reports every rule a page breaks.

## Considered Options

- **Put the budget in `trajectonomics/cicd` as an organisation standard.** Rejected. The numbers were proposed for this Site, and a shared budget would either be too loose for it or too tight for a repository that ships a framework.
- **Measure the HTML and CSS compressed together.** Rejected. The budget is the sum of the separate files' gzip sizes, so a stylesheet is not made cheaper by sitting next to the HTML in one stream.
- **Compress the JavaScript too.** Rejected. The uncompressed ceiling is what stops a framework runtime: a minifier or a compressor must not be able to hide it.
- **Run the weight check in its own workflow.** Rejected. The shared check already builds before its built-file step, so the budget belongs there; the browser-measured limits are a separate workflow (site#10).
- **Allow a system font to be downloaded as a web font.** Rejected. A download delays the first paint and is the regression the ban exists to stop.

## Consequences

- The build is judged with the structural rules in [ADR 0004](./0004-build-output-checks.md); this record adds the byte rules, and a new rule is still one file, one Error Code and one fixture test.
- Raising a number, adding a page rule or allowing a font is an ADR change, not a configuration edit.
- A new page, a new stylesheet or a new script is measured automatically; the two Not-found pages are pages like any other.
- The browser-measured limits — axe, keyboard, language and Lighthouse mobile performance — are recorded with the browser workflow (site#10), not here.
