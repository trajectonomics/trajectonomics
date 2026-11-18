import { describe, expect, it } from "bun:test"
import { shippedThemes } from "../design/shipped-themes"
import { TEST_BUILT_CSS, TEST_TOKENS, testFiles } from "./test-page"
import { checkTheme } from "./theme"

/** The Themes each kind of build ships: production forces one, every other build follows the device. */
const PRODUCTION = shippedThemes("production")
const PREVIEW = shippedThemes("preview")

/** The stylesheet the fixture page loads, and the declaration the colour-scheme rule looks for. */
const LINK = '<link rel="stylesheet" href="/_astro/site.css">'
const SCHEME = ":root{color-scheme:dark}"

const BODY =
	'<body class="bg-background text-foreground"><header></header><main><h1>a</h1></main><footer></footer></body>'

function codes(themes: readonly string[], index?: string, css?: string): readonly string[] {
	const overrides: { index?: string; css?: string } = {}
	if (index !== undefined) overrides.index = index
	if (css !== undefined) overrides.css = css
	return checkTheme(testFiles(overrides), TEST_TOKENS, themes).map((failure) => failure.code)
}

function page(htmlAttributes: string, head = LINK): string {
	return `<html lang="en" ${htmlAttributes}><head>${head}</head>${BODY}</html>`
}

describe("the Theme the markup asks for", () => {
	it("passes a page that asks for the Theme production ships", () => {
		expect(codes(PRODUCTION)).toEqual([])
	})

	it("fails a page whose html element has no data-theme, which leaves it unstyled", () => {
		expect(codes(PRODUCTION, page("lang-en"))).toContain("THEME_ATTRIBUTE_MISSING")
	})

	it("fails a page that asks for a name the published CSS does not define", () => {
		expect(codes(PRODUCTION, page('data-theme="sepia"'))).toContain("THEME_ATTRIBUTE_NOT_PUBLISHED")
	})

	it("fails a page that asks for the light Theme in production, which that build does not ship", () => {
		expect(codes(PRODUCTION, page('data-theme="light"'))).toContain("THEME_ATTRIBUTE_NOT_SHIPPED")
	})

	it("passes a page that asks for either Theme in a preview build, which ships both", () => {
		expect(codes(PREVIEW, page('data-theme="light"'))).toEqual([])
		expect(codes(PREVIEW, page('data-theme="dark"'))).toEqual([])
	})

	it("lets a data block sit in the head, because the page runs none of it", () => {
		const data = '<script type="application/ld+json">{"@context":"https://schema.org"}</script>'
		expect(codes(PRODUCTION, page('data-theme="dark"', `${data}${LINK}`))).toEqual([])
	})

	it("judges the Not-found page as well, not only the index page", () => {
		const files = [
			{ path: "index.html", content: page('data-theme="dark"') },
			{ path: "404.html", content: page("lang-en", LINK) },
			{ path: "_astro/site.css", content: TEST_BUILT_CSS },
		]
		const failures = checkTheme(files, TEST_TOKENS, PRODUCTION)
		expect(failures.filter((failure) => failure.path === "index.html")).toEqual([])
		expect(failures.map((failure) => failure.code)).toContain("THEME_ATTRIBUTE_MISSING")
	})
})

describe("the stylesheet the page paints with", () => {
	it("passes a page that links a stylesheet", () => {
		expect(codes(PRODUCTION)).toEqual([])
	})

	it("fails a page with no stylesheet at all, because nothing paints it", () => {
		const data = '<script type="application/ld+json">{"@context":"https://schema.org"}</script>'
		expect(codes(PRODUCTION, page('data-theme="dark"', data))).toContain("THEME_STYLESHEET_MISSING")
	})
})

describe("the Themes in the stylesheet the page loads", () => {
	it("passes a stylesheet that carries both published Themes at the published values", () => {
		expect(codes(PRODUCTION)).toEqual([])
	})

	it("passes a stylesheet whose short hexadecimal values name the published colours", () => {
		const css = `[data-theme=light]{color-scheme:light;--ds-color-background:#fff;--ds-color-foreground:#0a0a0a;--ds-color-card:#fff;--ds-color-muted:#f5f5f5;--ds-color-muted-foreground:#525252;--ds-color-stage:#171717;--ds-color-stage-foreground:#fafafa}[data-theme=dark]{color-scheme:dark;--ds-color-background:#0a0a0a;--ds-color-foreground:#fafafa;--ds-color-card:#171717;--ds-color-muted:#262626;--ds-color-muted-foreground:#a1a1a1;--ds-color-stage:#0a0a0a;--ds-color-stage-foreground:#fafafa}`
		expect(codes(PRODUCTION, undefined, css)).toEqual([])
	})

	it("fails a build with no prebuilt Theme CSS, where every role resolves to nothing", () => {
		expect(codes(PRODUCTION, undefined, `body{color:black}${SCHEME}`)).toContain(
			"THEME_CSS_NOT_BUILT",
		)
	})

	it("fails a stylesheet that lost one published Theme", () => {
		const css = `[data-theme=light]{color-scheme:light;--ds-color-background:#fff;--ds-color-foreground:#0a0a0a;--ds-color-card:#fff;--ds-color-muted:#f5f5f5;--ds-color-muted-foreground:#525252}${SCHEME}`
		expect(codes(PRODUCTION, undefined, css)).toContain("THEME_CSS_NOT_BUILT")
	})

	it("fails a stylesheet that defines a role at a value the package does not publish", () => {
		const css = `[data-theme=light]{color-scheme:light;--ds-color-background:#fefefe;--ds-color-foreground:#0a0a0a;--ds-color-card:#fff;--ds-color-muted:#f5f5f5;--ds-color-muted-foreground:#525252}[data-theme=dark]{color-scheme:dark;--ds-color-background:#0a0a0a;--ds-color-foreground:#fafafa;--ds-color-card:#171717;--ds-color-muted:#262626;--ds-color-muted-foreground:#a1a1a1}`
		expect(codes(PRODUCTION, undefined, css)).toContain("THEME_CSS_NOT_BUILT")
	})
})
