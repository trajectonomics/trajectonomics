import { describe, expect, it } from "bun:test"
import { parseDesignTokens } from "../design/tokens"
import { checkTextContrast } from "./contrast"
import { TEST_BUILT_CSS, TEST_TAILWIND_CSS, TEST_TOKENS, testFiles } from "./test-page"

function failures(index?: string, tokens = TEST_TOKENS) {
	return checkTextContrast(testFiles(index === undefined ? {} : { index }), tokens)
}

function codes(index?: string, tokens = TEST_TOKENS): readonly string[] {
	return failures(index, tokens).map((failure) => failure.code)
}

function page(bodyClass: string, content: string): string {
	return `<html lang="en" data-theme="light"><head><script>a</script><link rel="stylesheet" href="/_astro/site.css"></head><body class="${bodyClass}"><header></header><main><h1>Hero</h1>${content}</main><footer></footer></body></html>`
}

describe("the contrast of the text on the built page", () => {
	it("passes the shell's role pairs in both Themes", () => {
		expect(codes()).toEqual([])
	})

	it("fails muted text on a muted background: under AA in the light Theme, and it reports the ratio", () => {
		const found = failures(
			page("bg-background text-foreground", '<p class="bg-muted text-muted-foreground">Quiet</p>'),
		)
		expect(found.map((failure) => failure.code)).toEqual(["TEXT_CONTRAST_TOO_LOW"])
		expect(found[0]?.message).toContain("light")
		expect(found[0]?.message).toMatch(/4\.\d\d:1/)
	})

	it("fails text whose colours no Semantic Token Role resolves", () => {
		expect(codes(page("", "<p>Unstyled</p>"))).toContain("TEXT_COLOUR_UNRESOLVED")
	})

	it("fails a Theme whose colour is written in a form this check cannot read", () => {
		const unreadable = parseDesignTokens({
			themes: [
				"[data-theme=light]{--ds-color-background:#ffffff;--ds-color-foreground:oklch(0.5 0.1 200)}",
			],
			tailwind: TEST_TAILWIND_CSS,
		})
		const found = checkTextContrast(
			[
				{ path: "index.html", content: page("bg-background text-foreground", "<p>Plain</p>") },
				{ path: "_astro/site.css", content: TEST_BUILT_CSS },
			],
			unreadable,
		).map((failure) => failure.code)
		expect(found.length).toBeGreaterThan(0)
		expect(found.every((code) => code === "TEXT_COLOUR_UNREADABLE")).toBe(true)
	})
})

describe("the WCAG bar a text run is held to", () => {
	/** 3.45:1 against white: fine for a large heading, under AA for body text. */
	const quiet = parseDesignTokens({
		themes: ["[data-theme=light]{--ds-color-background:#ffffff;--ds-color-foreground:#8a8a8a}"],
		tailwind: TEST_TAILWIND_CSS,
	})

	function quietCodes(hero: string, body: string): readonly string[] {
		const content = `<html lang="en" data-theme="light"><head><script>a</script><link rel="stylesheet" href="/_astro/site.css"></head><body class="bg-background text-foreground"><header></header><main><h1 class="${hero}">Hero</h1>${body}</main><footer></footer></body></html>`
		return checkTextContrast(
			[
				{ path: "index.html", content },
				{ path: "_astro/site.css", content: TEST_BUILT_CSS },
			],
			quiet,
		).map((failure) => failure.code)
	}

	it("passes a 3.45:1 pair on a 36px heading, which WCAG calls large text", () => {
		expect(quietCodes("text-4xl", "")).toEqual([])
	})

	it("fails the same 3.45:1 pair at body size, which WCAG calls normal text", () => {
		expect(quietCodes("", "<p>Body</p>")).toEqual([
			"TEXT_CONTRAST_TOO_LOW",
			"TEXT_CONTRAST_TOO_LOW",
		])
	})

	it("passes a 3.45:1 pair at 20px bold, which WCAG also calls large", () => {
		expect(quietCodes("text-xl font-bold", "")).toEqual([])
	})

	it("fails a 3.45:1 pair at 20px regular, which is under the large-text size", () => {
		expect(quietCodes("text-xl", "")).toEqual(["TEXT_CONTRAST_TOO_LOW"])
	})
})
