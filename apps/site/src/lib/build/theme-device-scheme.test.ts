import { describe, expect, it } from "bun:test"
import { shippedThemes } from "../design/shipped-themes"
import type { BuiltFile } from "./built-files"
import { TEST_BUILT_CSS } from "./test-page"
import { checkThemeDeviceScheme } from "./theme-device-scheme"

/** The Themes each kind of build ships: production forces one, every other build follows the device. */
const PRODUCTION = shippedThemes("production")
const PREVIEW = shippedThemes("preview")

/** A page that links the fixture stylesheet and runs nothing. */
const PAGE = `<!DOCTYPE html><html lang="en" data-theme="dark"><head><link rel="stylesheet" href="/_astro/site.css"></head><body><main></main></body></html>`

/** One built Site of a page and the stylesheet it loads, each replaceable. */
function build(index = PAGE, css = TEST_BUILT_CSS): readonly BuiltFile[] {
	return [
		{ path: "en/index.html", content: index },
		{ path: "_astro/site.css", content: css },
	]
}

function codes(
	themes: readonly string[],
	files: readonly BuiltFile[] = build(),
): readonly string[] {
	return checkThemeDeviceScheme(files, themes).map((failure) => failure.code)
}

/** The fixture page with one part of its head replaced. */
function withHead(head: string): string {
	return PAGE.replace('<link rel="stylesheet" href="/_astro/site.css">', head)
}

describe("the device scheme a build that forces one Theme refuses to follow", () => {
	it("passes a build whose pages and stylesheets never name a device scheme", () => {
		expect(codes(PRODUCTION)).toEqual([])
	})

	it("fails a page that runs the flip script, whose body the element scan drops", () => {
		const script =
			'<script>if (window.matchMedia("(prefers-color-scheme: dark)").matches) flip()</script>'
		expect(codes(PRODUCTION, build(withHead(script)))).toEqual(["THEME_DEVICE_SCHEME_PRESENT"])
	})

	it("fails a page whose stylesheet link asks the device for a scheme", () => {
		const head =
			'<link rel="stylesheet" media="(prefers-color-scheme: dark)" href="/_astro/site.css">'
		expect(codes(PRODUCTION, build(withHead(head)))).toEqual(["THEME_DEVICE_SCHEME_PRESENT"])
	})

	it("fails a page whose linked stylesheet names a device scheme", () => {
		const css = `${TEST_BUILT_CSS}@media (prefers-color-scheme: dark){:root{--ds-color-background:#0a0a0a}}`
		expect(codes(PRODUCTION, build(PAGE, css))).toEqual(["THEME_DEVICE_SCHEME_PRESENT"])
	})

	it("fails a page whose stylesheet imports a sheet that names a device scheme", () => {
		const files = [
			{ path: "en/index.html", content: PAGE },
			{ path: "_astro/site.css", content: `@import "./override.css";${TEST_BUILT_CSS}` },
			{
				path: "_astro/override.css",
				content: "@media (prefers-color-scheme: dark){:root{--ds-color-stage:#0a0a0a}}",
			},
		]
		expect(codes(PRODUCTION, files)).toEqual(["THEME_DEVICE_SCHEME_PRESENT"])
	})

	it("names the place that asks the device, so a maintainer knows where to look", () => {
		const css = `${TEST_BUILT_CSS}@media (prefers-color-scheme: dark){:root{--ds-color-stage:#0a0a0a}}`
		const [failure] = checkThemeDeviceScheme(build(PAGE, css), PRODUCTION)
		expect(failure?.path).toBe("/en/")
		expect(failure?.message).toContain("_astro/site.css")
		expect(failure?.message).toContain("prefers-color-scheme")
	})
})

describe("the device scheme a build that ships both Themes asks for", () => {
	it("passes the flip script and the two device queries a preview build writes", () => {
		const head =
			'<script>if (window.matchMedia("(prefers-color-scheme: dark)").matches) flip()</script>' +
			'<link rel="stylesheet" href="/_astro/site.css">'
		expect(codes(PREVIEW, build(withHead(head)))).toEqual([])
	})
})
