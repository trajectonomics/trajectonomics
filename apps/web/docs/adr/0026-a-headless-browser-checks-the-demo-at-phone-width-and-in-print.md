---
status: accepted
---

# A headless browser checks the Demo at phone width and in print

The Dashboard's tests render components to a string, which cannot see what only a browser lays out. Two reviews in a row found such faults by hand with a throwaway headless Chromium script, and each fix could have been undone without anyone noticing ([#377](https://github.com/trajectonomics/trajectonomics/issues/377)):

- the printed Yearly table running 1751px wide on an A4 page, and dark-theme colours surviving into print (#373);
- a 950px-wide page at 360px, from screen-reader-only labels that escaped their table's scroll box (#352).

The owner decided on 2026-11-25 to add a browser runner, and to look at the screenshots it takes.

## Decision

- **Playwright, Chromium only, a dev dependency of `apps/web`** (`@playwright/test`, pinned to the version `apps/site` and `apps/docs` use, so the three share one browser download). The suite lives in `apps/web/browser/` with the `.e2e.ts` suffix, which `bun test` never finds, and runs only through its own script, `bun run test:browser`. `bun run check` and `bun test` stay browser-free, so a local check needs no browser, and `tooling/guards` pins that.
- **It runs against the built Demo.** `vite build` writes `dist/`, `browser/serve.ts` serves it on `127.0.0.1` (a closed, read-only file server for the tests, never the Dashboard's own server), and every check opens a page with `?demo=1`, so the figures are the Demo's ([ADR 0021](0021-the-demo-snapshot-is-generated-at-build-and-not-committed.md)). The pages come from the folders under `src/routes/`, so a page added later is checked without an edit to the suite.
- **Checks are rules, not pixel comparisons**, as in [docs ADR 0004](../../../docs/docs/adr/0004-browser-tests-run-outside-the-deploy-gate.md). Screenshots are taken for people to look at and are never compared.
  - *Every page, at 360px and 1280px, in the light and the dark theme:* the page does not scroll sideways (`scrollWidth <= innerWidth`), and a table wider than the screen sits in a scroll box that fits it. Each page is photographed full length first, whatever the result.
  - *Screen-reader-only labels stay in their table (#352), at 360px:* the Demo has no What-if session, whose labels are what escaped, so the check puts a label of the same class in the last cell of each table, one at a time, and fails when the page then scrolls sideways. A scroll box around a table has to be `relative`. This found two scroll boxes (Compare's figures and Estate's breakdown) that were not, and this change fixes them.
  - *Reports, Projection and Cash flow in print, from each theme (#373):* the page asks for A4 landscape with 12mm margins, so print media is emulated at 1032px, the 273mm the paper holds. No table sticks out of it and none may rely on a scroll box (paper does not scroll), `html` and `body` are black on white, every piece of text has at least 3:1 contrast on the surface behind it, and flipping the theme prints the same surfaces. A semantic colour (a warning's orange) may differ by theme, so text is judged by contrast, not by equality. The first CI run showed the Reports table, whose cells never wrap, 1013px wide on the runner's fallback font (983px on a developer's machine), 5px past the paper once the page's own 24px side padding was counted. The paper already has 12mm margins, so `main` takes no side padding in print (`print:px-0`), which gives the table the full 1032px.
- **CI runs it as `Check web browser`**, a job of its own that runs when `Check web` does, and is in `Check`'s `needs`. It builds with `turbo run @trajectonomics/web#build` (no `--` arguments, so the build hits the cache), restores Chromium from the Playwright cache the Site's and the docs' browser workflows already fill, and uploads `apps/web/screenshots/` as an artifact on every run, pass or fail. The time budget is in [docs/runbooks/ci.md](../../../../docs/runbooks/ci.md).
- **A new regression is caught by adding a rule, not a baseline.** Each of the three regressions above was reintroduced on a scratch commit and the suite failed on it (see the pull request that added this ADR).

## Considered Options

- **A manual script under `scripts/` that reviewers run.** Rejected: nothing enforces it, and the three faults were found by exactly that kind of script.
- **Pixel comparison against committed screenshots.** Deferred, as for the Site and docs: every layout change would churn the baselines. The screenshots are an artifact for the eye.
- **Running the suite inside `bun run check`.** Rejected: it would need a browser on every machine that runs the check, for a check that already takes minutes.
- **A What-if session in the browser to reproduce #352 exactly.** Rejected: a session needs the edit server and its token, which the Demo never has. The synthetic label reaches the same layout rule without it.
- **Print at A4 portrait (703px).** Rejected: the page declares landscape, and Reports is wider than portrait paper by design (its columns are hidden by the person, not split).

## Consequences

- A pull request that affects `apps/web` or the command line gains one job, in parallel with the shards, and does not lengthen the critical path.
- A page that is wider than a phone must either fit or scroll inside its own `relative` box, and a table printed on A4 must fit 1032px with its scroll box opened. A page that cannot meet that is a page to change, not a rule to loosen.
