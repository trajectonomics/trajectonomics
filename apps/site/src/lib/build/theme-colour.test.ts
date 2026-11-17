import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { TEST_TOKENS } from "./test-page"
import { checkThemeColour } from "./theme-colour"

/** The two paints the published tokens state, written as the build writes them. */
const LIGHT = '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">'
const DARK = '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a">'

/** One built page with the head a test hands it. */
function page(path: string, head = `${LIGHT}${DARK}`): BuiltFile {
	return {
		path,
		content: `<html lang="en"><head>${head}</head><body><main></main></body></html>`,
	}
}

/** The two homes and a Not-found page, so a test names the page it changes. */
function build(changed?: BuiltFile): readonly BuiltFile[] {
	return ["th/index.html", "en/index.html", "404.html"].map((path) =>
		changed?.path === path ? changed : page(path),
	)
}

function codes(files: readonly BuiltFile[] = build()): readonly string[] {
	return checkThemeColour(files, TEST_TOKENS).map((failure) => failure.code)
}

describe("the browser bar a built page paints", () => {
	it("passes a page with one paint per published Theme, at the published colour", () => {
		expect(codes()).toEqual([])
	})

	it("fails a page that carries no theme-color at all, once per Theme the page owes", () => {
		expect(codes(build(page("en/index.html", "")))).toEqual([
			"THEME_COLOUR_MISSING",
			"THEME_COLOUR_MISSING",
		])
	})

	it("fails a page that carries one Theme's paint twice", () => {
		expect(codes(build(page("en/index.html", `${LIGHT}${LIGHT}${DARK}`)))).toEqual([
			"THEME_COLOUR_DUPLICATE",
		])
	})

	it("fails a page whose light paint is a colour the Theme does not publish", () => {
		const wrong = LIGHT.replace("#ffffff", "#f5f5f5")
		expect(codes(build(page("en/index.html", `${wrong}${DARK}`)))).toEqual([
			"THEME_COLOUR_NOT_PUBLISHED",
		])
	})

	it("fails a paint that follows no device scheme, which no browser can read", () => {
		const unqualified = '<meta name="theme-color" content="#ffffff">'
		expect(codes(build(page("404.html", `${unqualified}${DARK}`)))).toEqual([
			"THEME_COLOUR_MEDIA_WRONG",
			"THEME_COLOUR_MISSING",
		])
	})

	it("fails a paint under a media query that is not the one the Theme's scheme names", () => {
		const screen = LIGHT.replace("(prefers-color-scheme: light)", "screen")
		expect(codes(build(page("th/index.html", `${screen}${DARK}`)))).toEqual([
			"THEME_COLOUR_MEDIA_WRONG",
			"THEME_COLOUR_MISSING",
		])
	})

	it("names the Theme, the colour the build wrote and the colour the Theme publishes", () => {
		const failure = checkThemeColour(
			build(page("en/index.html", `${LIGHT}${DARK.replace("#0a0a0a", "#000000")}`)),
			TEST_TOKENS,
		)[0]
		expect(failure?.message).toContain("dark")
		expect(failure?.message).toContain("#000000")
		expect(failure?.message).toContain("#0a0a0a")
		expect(failure?.path).toBe("/en/")
	})
})
