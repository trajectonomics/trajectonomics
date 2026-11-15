import { describe, expect, it } from "bun:test"
import { TEST_BUILT_CSS, TEST_TOKENS, testFiles } from "./test-page"
import { checkTheme } from "./theme"

function codes(index?: string, css?: string): readonly string[] {
	const overrides: { index?: string; css?: string } = {}
	if (index !== undefined) overrides.index = index
	if (css !== undefined) overrides.css = css
	return checkTheme(testFiles(overrides), TEST_TOKENS).map((failure) => failure.code)
}

const HEAD = '<script>setTheme()</script><link rel="stylesheet" href="/_astro/site.css">'
const BODY =
	'<body class="bg-background text-foreground"><header></header><main><h1>a</h1></main><footer></footer></body>'

function page(htmlAttributes: string, head = HEAD): string {
	return `<html lang="en" ${htmlAttributes}><head>${head}</head>${BODY}</html>`
}

describe("the Theme the markup asks for", () => {
	it("passes a page that falls back to the light Theme", () => {
		expect(codes()).toEqual([])
	})

	it("fails a page whose html element has no data-theme, which leaves it unstyled", () => {
		expect(codes(page("lang-en"))).toContain("THEME_ATTRIBUTE_MISSING")
	})

	it("fails a page that asks for a Theme the published CSS does not define", () => {
		expect(codes(page('data-theme="sepia"'))).toContain("THEME_ATTRIBUTE_NOT_PUBLISHED")
	})

	it("fails a page whose no-JavaScript fallback is not light", () => {
		expect(codes(page('data-theme="dark"'))).toContain("THEME_FALLBACK_NOT_LIGHT")
	})

	it("judges the Not-found page as well, not only the index page", () => {
		const files = [
			{ path: "index.html", content: page('data-theme="light"') },
			{ path: "404.html", content: page("lang-en", "") },
			{ path: "_astro/site.css", content: TEST_BUILT_CSS },
		]
		const failures = checkTheme(files, TEST_TOKENS)
		expect(failures.filter((failure) => failure.path === "index.html")).toEqual([])
		expect(failures.map((failure) => failure.code)).toContain("THEME_SCRIPT_MISSING")
	})
})

describe("the Theme script before the first paint", () => {
	it("passes a page whose inline script comes before the stylesheet", () => {
		expect(codes()).toEqual([])
	})

	it("fails a page whose inline script comes after the first stylesheet", () => {
		const head = '<link rel="stylesheet" href="/_astro/site.css"><script>setTheme()</script>'
		expect(codes(page('data-theme="light"', head))).toContain("THEME_SCRIPT_NOT_FIRST")
	})

	it("fails a page whose only script loads a file, which runs too late to paint the first frame", () => {
		const head =
			'<script src="/_astro/theme.js"></script><link rel="stylesheet" href="/_astro/site.css">'
		expect(codes(page('data-theme="light"', head))).toContain("THEME_SCRIPT_MISSING")
	})

	it("fails a page with no stylesheet at all, because nothing paints it", () => {
		expect(codes(page('data-theme="light"', "<script>setTheme()</script>"))).toContain(
			"THEME_STYLESHEET_MISSING",
		)
	})
})

describe("the Themes in the stylesheet the page loads", () => {
	it("passes a stylesheet that carries both Themes at the published values", () => {
		expect(codes()).toEqual([])
	})

	it("passes a stylesheet whose short hexadecimal values name the published colours", () => {
		const css =
			"[data-theme=light]{--ds-color-background:#fff;--ds-color-foreground:#0a0a0a;--ds-color-card:#fff;--ds-color-muted:#f5f5f5;--ds-color-muted-foreground:#525252;--ds-color-stage:#171717;--ds-color-stage-foreground:#fafafa}[data-theme=dark]{--ds-color-background:#0a0a0a;--ds-color-foreground:#fafafa;--ds-color-card:#171717;--ds-color-muted:#262626;--ds-color-muted-foreground:#a1a1a1;--ds-color-stage:#0a0a0a;--ds-color-stage-foreground:#fafafa}"
		expect(codes(undefined, css)).toEqual([])
	})

	it("fails a build with no prebuilt Theme CSS, where every role resolves to nothing", () => {
		expect(codes(undefined, "body{color:black}")).toContain("THEME_CSS_NOT_BUILT")
	})

	it("fails a stylesheet that lost one Theme", () => {
		const css =
			"[data-theme=light]{--ds-color-background:#fff;--ds-color-foreground:#0a0a0a;--ds-color-card:#fff;--ds-color-muted:#f5f5f5;--ds-color-muted-foreground:#525252}"
		expect(codes(undefined, css)).toContain("THEME_CSS_NOT_BUILT")
	})

	it("fails a stylesheet that defines a role at a value the package does not publish", () => {
		const css =
			"[data-theme=light]{--ds-color-background:#fefefe;--ds-color-foreground:#0a0a0a;--ds-color-card:#fff;--ds-color-muted:#f5f5f5;--ds-color-muted-foreground:#525252}[data-theme=dark]{--ds-color-background:#0a0a0a;--ds-color-foreground:#fafafa;--ds-color-card:#171717;--ds-color-muted:#262626;--ds-color-muted-foreground:#a1a1a1}"
		expect(codes(undefined, css)).toContain("THEME_CSS_NOT_BUILT")
	})
})
