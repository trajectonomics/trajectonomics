---
status: accepted
---

# The built Site is judged by a pure core, then scanned after the build

## Context

`bun run check` must fail when a built page breaks the structure or when Thai and English drift apart, not only when a source file stops compiling. The build is the source of truth ([ADR 0002](./0002-site-worker-with-static-assets.md)): HTML fetched through the router is not. Astro writes `dist/`, the Worker's assets root, and the check runs before anything is deployed.

## Decision

- **The rules are a pure core.** Each check in `src/lib/build/` takes `BuiltFile[]` (a path and its text) and returns `BuildFailure[]`. No check reads the disk, the clock or the network.
- **The I/O is an adapter.** `scripts/adapters/build-files.ts` reads `dist/` into `BuiltFile[]`; `scripts/adapters/design-tokens.ts` reads the published theme the colours are judged against. `checkBuild(files, tokens, mode)` runs every rule and names every failure, not only the first.
- **One Error Code per rule.** The code names the rule; `path` names the input that broke: the page URL for the page rules here, the built file for an asset rule, and the Dictionary key path for a parity rule. Two conditions never share a code, and a code is never widened.
- **The HTML reader is hand-rolled** (`src/lib/build/html.ts`), so no HTML-parser dependency joins the tree. It reads double-quoted, single-quoted and unquoted attributes, ignores comments, and ignores the text of `script` and `style` when counting tags and reading attributes. The `npx traj` and placeholder scans read the raw text, comments included.
- **Fixture tests** assert one Error Code per error condition. They do not read `dist/`, so they run before the build. `test/dist/site.test.ts` is the dist scan: a separate `bun test` over the real build, run after it, which fails when `dist/` is absent.
- **The build mode is an explicit argument**, `production`, `preview` or `development`: `import.meta.env.PROD` is not the signal, because a preview build is still production as far as that flag is concerned. A scan named with no mode judges a production build, so the placeholder cannot hide. `bun run check` builds with Astro mode `preview` and runs the scan with `SITE_BUILD_MODE=preview`.
- **The owner's placeholder is allowed before production.** A production build that contains `[OWNER TO WRITE]` fails `OWNER_PLACEHOLDER_IN_PRODUCTION`. A preview or development build may carry it, and still requires it on every home (`OWNER_WRITTEN_MISSING`), so no agent invents text the owner has not written. Switching the check to a production build waits for site#7.
- **The two source Dictionaries are compared, not the build**: nested object keys and every array index are walked both ways (`DICTIONARY_KEY_MISSING`), and a path whose value kind differs fails `DICTIONARY_SHAPE`. Values may differ.
- **No absolute asset.** A `script` `src`, a stylesheet, a script or style preload, or a `modulepreload` whose URL is absolute or protocol-relative fails `EXTERNAL_ASSET`; root-relative and relative URLs pass. A stylesheet's own `url()` and `@import` are outside this rule, and a downloaded font is judged separately.
- **The `hreflang` pair points at itself.** Each Language home carries exactly one alternate per Language, at that Language's Locale URL: missing is `HREFLANG_MISSING`, a second is `HREFLANG_DUPLICATE`, a wrong path is `HREFLANG_TARGET`. A path-absolute href is enough; when any alternate is absolute, every one of them shares one origin, and a split origin is `HREFLANG_TARGET`. `x-default` is not required, and no rule judges it.

## Consequences

- A rule is tested against fixture text before it meets a build, so a `bun test` failure names the rule and the fixture that broke it.
- The scan can only pass on a build: `bun test ./test/dist` fails on a missing `dist/`, so a skipped build cannot look green.
- A production build is the only one that can ship, and it cannot contain the placeholder; a preview build can go live before the owner writes it.
- A new rule is one file in `src/lib/build/`, one Error Code and one fixture test. A new Language is one Dictionary file, and the parity check needs no change.
