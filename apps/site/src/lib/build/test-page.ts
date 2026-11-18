import { type DesignTokens, parseDesignTokens } from "../design/tokens"
/**
 * Test support: the built pages, stylesheet and Web Consumer Contract the built-file checks are
 * tested against. Nothing in the Site imports this module.
 */
import type { BuiltFile } from "./built-files"

/** The published Themes, as the Prebuilt Theme CSS writes them. */
export const TEST_THEME_CSS = `[data-theme="light"] {
	--ds-color-background: #ffffff;
	--ds-color-foreground: #0a0a0a;
	--ds-color-card: #ffffff;
	--ds-color-muted: #f5f5f5;
	--ds-color-muted-foreground: #525252;
	--ds-color-stage: #171717;
	--ds-color-stage-foreground: #fafafa;
}
[data-theme="dark"] {
	--ds-color-background: #0a0a0a;
	--ds-color-foreground: #fafafa;
	--ds-color-card: #171717;
	--ds-color-muted: #262626;
	--ds-color-muted-foreground: #a1a1a1;
	--ds-color-stage: #0a0a0a;
	--ds-color-stage-foreground: #fafafa;
}`

/** The Tailwind Theme Stylesheet, as the package writes it: one utility per Semantic Token Role. */
export const TEST_TAILWIND_CSS = `@theme inline {
	--color-background: var(--ds-color-background);
	--color-foreground: var(--ds-color-foreground);
	--color-card: var(--ds-color-card);
	--color-muted: var(--ds-color-muted);
	--color-muted-foreground: var(--ds-color-muted-foreground);
	--color-stage: var(--ds-color-stage);
	--color-stage-foreground: var(--ds-color-stage-foreground);
}`

/** The Web Consumer Contract, read the way `verify:build` reads the published package. */
export const TEST_TOKENS: DesignTokens = parseDesignTokens({
	themes: [TEST_THEME_CSS],
	tailwind: TEST_TAILWIND_CSS,
})

/** The built stylesheet: the same Themes, minified the way a build emits them, plus the type scale. */
export const TEST_BUILT_CSS = `[data-theme=light]{color-scheme:light;--ds-color-background:#fff;--ds-color-foreground:#0a0a0a;--ds-color-card:#fff;--ds-color-muted:#f5f5f5;--ds-color-muted-foreground:#525252;--ds-color-stage:#171717;--ds-color-stage-foreground:#fafafa}[data-theme=dark]{color-scheme:dark;--ds-color-background:#0a0a0a;--ds-color-foreground:#fafafa;--ds-color-card:#171717;--ds-color-muted:#262626;--ds-color-muted-foreground:#a1a1a1;--ds-color-stage:#0a0a0a;--ds-color-stage-foreground:#fafafa}:root{--text-4xl:2.25rem;--text-xl:1.25rem;--text-lg:1.125rem;--font-weight-bold:700}.text-4xl{font-size:var(--text-4xl)}.text-xl{font-size:var(--text-xl)}.text-lg{font-size:var(--text-lg)}.font-bold{font-weight:var(--font-weight-bold)}`

/** One built page showing the three landmarks and the stylesheet that paints it, with no Theme script. */
export const TEST_PAGE = `<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><link rel="stylesheet" href="/_astro/site.css"><link rel="icon" href="/favicon/favicon.svg" type="image/svg+xml"><title>Trajectonomics</title></head><body class="bg-background text-foreground"><header class="border-b"><nav><a href="/docs/">Docs</a></nav></header><main class="bg-muted text-foreground"><h1>Hero</h1><p class="text-muted-foreground">Sub-line</p></main><footer class="border-t bg-stage text-stage-foreground"><a href="https://github.com/trajectonomics">GitHub</a></footer></body></html>`

/** A built Site of both pages and one stylesheet, with the index page and the CSS replaceable. */
export function testFiles(overrides: { readonly index?: string; readonly css?: string } = {}) {
	return [
		{ path: "index.html", content: overrides.index ?? TEST_PAGE },
		{ path: "404.html", content: TEST_PAGE },
		{ path: "_astro/site.css", content: overrides.css ?? TEST_BUILT_CSS },
	] as const satisfies readonly BuiltFile[]
}
