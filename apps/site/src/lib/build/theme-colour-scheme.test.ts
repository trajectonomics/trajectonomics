import { describe, expect, it } from "bun:test"
import { shippedThemes } from "../design/shipped-themes"
import type { BuiltFile } from "./built-files"
import { checkThemeColourScheme } from "./theme-colour-scheme"

/** The Themes each kind of build ships: production forces one, every other build follows the device. */
const PRODUCTION = shippedThemes("production")
const PREVIEW = shippedThemes("preview")

/** A page that links the fixture stylesheet. */
const PAGE = `<!DOCTYPE html><html lang="en" data-theme="dark"><head><link rel="stylesheet" href="/_astro/site.css"></head><body><main></main></body></html>`

/** Each Theme's own declaration, the way the Site's stylesheet writes it. */
const LIGHT = '[data-theme="light"]{color-scheme:light}'
const DARK = '[data-theme="dark"]{color-scheme:dark}'

/** One built Site of a page and the stylesheet it loads. */
function build(css = `${LIGHT}${DARK}`): readonly BuiltFile[] {
	return [
		{ path: "index.html", content: PAGE },
		{ path: "_astro/site.css", content: css },
	]
}

function codes(
	themes: readonly string[],
	files: readonly BuiltFile[] = build(),
): readonly string[] {
	return checkThemeColourScheme(files, themes).map((failure) => failure.code)
}

describe("the `color-scheme` each Theme declares", () => {
	it("passes a stylesheet that states the `color-scheme` of the Theme production ships", () => {
		expect(codes(PRODUCTION, build(DARK))).toEqual([])
	})

	it("passes a stylesheet that states both Themes' `color-scheme`, as a preview build needs", () => {
		expect(codes(PREVIEW)).toEqual([])
	})

	it("fails a production stylesheet that states no `color-scheme` at all", () => {
		expect(codes(PRODUCTION, build(""))).toEqual(["THEME_COLOUR_SCHEME_MISSING"])
	})

	it("fails a production stylesheet that states only the deferred Theme's `color-scheme`", () => {
		expect(codes(PRODUCTION, build(LIGHT))).toEqual(["THEME_COLOUR_SCHEME_MISSING"])
	})

	it("fails a preview stylesheet that leaves one shipped Theme without one", () => {
		expect(codes(PREVIEW, build(DARK))).toEqual(["THEME_COLOUR_SCHEME_MISSING"])
	})

	it("passes when a sheet the page imports states it, not only the sheet it links", () => {
		const files = [
			{ path: "index.html", content: PAGE },
			{ path: "_astro/site.css", content: '@import "./scheme.css";body{color:red}' },
			{ path: "_astro/scheme.css", content: `${LIGHT}${DARK}` },
		]
		expect(codes(PREVIEW, files)).toEqual([])
	})

	it("names the Theme whose `color-scheme` is owed, and the page that paints without it", () => {
		const [failure] = checkThemeColourScheme(build(LIGHT), PRODUCTION)
		expect(failure?.path).toBe("/")
		expect(failure?.message).toContain("color-scheme: dark")
	})
})
