import { describe, expect, it } from "bun:test"
import { shippedThemes } from "../design/shipped-themes"
import type { BuiltFile } from "./built-files"
import { TEST_TOKENS } from "./test-page"
import { checkThemeColour } from "./theme-colour"

/** The Themes each kind of build ships: production forces one, every other build follows the device. */
const PRODUCTION = shippedThemes("production")
const PREVIEW = shippedThemes("preview")

/** The one paint a production build writes: the dark Theme's background, with no device query. */
const DARK = '<meta name="theme-color" content="#0a0a0a">'

/** One paint per Theme, under the device query that Theme follows. */
const PREVIEW_PAINTS =
	'<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">' +
	'<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a">'

/** One built page with the head a test hands it. */
function page(path: string, head = DARK): BuiltFile {
	return {
		path,
		content: `<html lang="en"><head>${head}</head><body><main></main></body></html>`,
	}
}

/** Every page of a preview build, each painting one bar per Theme. */
function previewBuild(head = PREVIEW_PAINTS): readonly BuiltFile[] {
	return ["th/index.html", "en/index.html", "404.html"].map((path) => page(path, head))
}

/** The two homes and a Not-found page, so a test names the page it changes. */
function build(changed?: BuiltFile): readonly BuiltFile[] {
	return ["th/index.html", "en/index.html", "404.html"].map((path) =>
		changed?.path === path ? changed : page(path),
	)
}

function codes(
	themes: readonly string[],
	files: readonly BuiltFile[] = build(),
): readonly string[] {
	return checkThemeColour(files, TEST_TOKENS, themes).map((failure) => failure.code)
}

describe("the browser bar a production build paints", () => {
	it("passes a page with one paint, at the shipped Theme's published background", () => {
		expect(codes(PRODUCTION)).toEqual([])
	})

	it("fails a page that carries no theme-color at all", () => {
		expect(codes(PRODUCTION, build(page("en/index.html", "")))).toEqual(["THEME_COLOUR_MISSING"])
	})

	it("fails a page that carries the paint twice", () => {
		expect(codes(PRODUCTION, build(page("en/index.html", `${DARK}${DARK}`)))).toEqual([
			"THEME_COLOUR_DUPLICATE",
		])
	})

	it("fails a page whose paint is a colour the Theme does not publish", () => {
		const wrong = DARK.replace("#0a0a0a", "#111111")
		expect(codes(PRODUCTION, build(page("en/index.html", wrong)))).toEqual([
			"THEME_COLOUR_NOT_PUBLISHED",
		])
	})

	it("fails a paint under a device-scheme query, which one shipped Theme does not state", () => {
		const device =
			'<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a">'
		expect(codes(PRODUCTION, build(page("404.html", device)))).toEqual([
			"THEME_COLOUR_MEDIA_NOT_SHIPPED",
			"THEME_COLOUR_MISSING",
		])
	})

	it("fails a paint under a media query no Theme names", () => {
		const screen = '<meta name="theme-color" media="screen" content="#0a0a0a">'
		expect(codes(PRODUCTION, build(page("th/index.html", screen)))).toEqual([
			"THEME_COLOUR_MEDIA_NOT_SHIPPED",
			"THEME_COLOUR_MISSING",
		])
	})

	it("names the Theme, the colour the build wrote and the colour the Theme publishes", () => {
		const failure = checkThemeColour(
			build(page("en/index.html", DARK.replace("#0a0a0a", "#111111"))),
			TEST_TOKENS,
			PRODUCTION,
		)[0]
		expect(failure?.message).toContain("dark")
		expect(failure?.message).toContain("#111111")
		expect(failure?.message).toContain("#0a0a0a")
		expect(failure?.path).toBe("/en/")
	})
})

describe("the browser bar a preview build paints", () => {
	it("passes a page with one paint per Theme, under that Theme's device query", () => {
		expect(codes(PREVIEW, previewBuild())).toEqual([])
	})

	it("fails a page that carries no device query, so no device paints the Theme it asks for", () => {
		const pages = previewBuild().map((file) =>
			file.path === "en/index.html" ? page("en/index.html", DARK) : file,
		)
		expect(codes(PREVIEW, pages)).toEqual([
			"THEME_COLOUR_MEDIA_NOT_SHIPPED",
			"THEME_COLOUR_MISSING",
			"THEME_COLOUR_MISSING",
		])
	})
})
