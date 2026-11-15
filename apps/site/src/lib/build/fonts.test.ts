import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkFonts, FONT_BUDGET_BYTES } from "./fonts"
import { asset, page } from "./testing/weight"

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkFonts(files).map((failure) => failure.code)
}

/** A built font file of a chosen size, which the scan reads as binary and measures by `bytes`. */
function font(path: string, bytes: number): BuiltFile {
	return { path, content: "", bytes }
}

const FACES = [
	font("fonts/aleo-latin-300.woff2", 14_900),
	font("fonts/aleo-latin-400.woff2", 14_848),
	font("fonts/azeret-mono-latin-500.woff2", 10_884),
]

const SITE_CSS = asset(
	"_astro/site.css",
	'@font-face{font-family:Aleo;src:url("/fonts/aleo-latin-300.woff2")}@font-face{font-family:Aleo;src:url("/fonts/aleo-latin-400.woff2")}@font-face{font-family:Azeret Mono;src:url("/fonts/azeret-mono-latin-500.woff2")}',
)

const LINK = '<link rel="stylesheet" href="/_astro/site.css">'

/** A page, its stylesheet and the three faces, plus whatever a test adds. */
function site(extra: readonly BuiltFile[] = [], pagePath = "en/index.html"): readonly BuiltFile[] {
	return [page(pagePath, LINK), SITE_CSS, ...FACES, ...extra]
}

/** One page linking one stylesheet, with a font file of `bytes` for its single `url()`. */
function big(bytes: number, pagePath = "en/index.html"): readonly BuiltFile[] {
	return [
		page(pagePath, '<link rel="stylesheet" href="/_astro/big.css">'),
		asset("_astro/big.css", 'body{src:url("/fonts/big.woff2")}'),
		font("fonts/big.woff2", bytes),
	]
}

describe("the font budget", () => {
	it("is 48,000 bytes a page, uncompressed", () => {
		expect(FONT_BUDGET_BYTES).toBe(48_000)
	})

	it("passes a page whose three faces stay under the budget", () => {
		expect(codes(site())).toEqual([])
	})

	it("passes a page whose fonts weigh exactly the budget", () => {
		expect(codes(big(48_000))).toEqual([])
	})

	it("fails a page whose fonts weigh one byte over the budget", () => {
		expect(codes(big(48_001))).toEqual(["FONT_BUDGET_OVER"])
	})

	it("counts a font once, however many stylesheets reference it", () => {
		const twice = '@font-face{src:url("/fonts/aleo-latin-300.woff2")}'
		const files = [
			page(
				"en/index.html",
				'<link rel="stylesheet" href="/_astro/a.css"><link rel="stylesheet" href="/_astro/b.css">',
			),
			asset("_astro/a.css", twice),
			asset("_astro/b.css", twice),
			...FACES,
		]
		expect(codes(files)).toEqual([])
	})

	it("follows a font on a stylesheet another stylesheet imports", () => {
		const files = [
			page("en/index.html", '<link rel="stylesheet" href="/_astro/a.css">'),
			asset("_astro/a.css", '@import "./deep/b.css";'),
			asset("_astro/deep/b.css", 'body{src:url("../../fonts/big.woff2")}'),
			font("fonts/big.woff2", 48_001),
		]
		expect(codes(files)).toEqual(["FONT_BUDGET_OVER"])
	})

	it("measures the Not-found document like any other page", () => {
		const failures = checkFonts(big(48_001, "404.html"))
		expect(failures.map((failure) => failure.code)).toEqual(["FONT_BUDGET_OVER"])
		expect(failures[0]?.path).toBe("/404.html")
	})
})

describe("the fonts a page serves", () => {
	it("fails a font another origin serves, as a preload", () => {
		const html =
			'<html><head><link rel="preload" as="font" href="https://fonts.example.com/x.woff2"></head></html>'
		expect(codes([{ path: "en/index.html", content: html }])).toEqual([
			"REMOTE_FONT_URL_PRESENT",
			"FONT_FROM_ANOTHER_ORIGIN",
		])
	})

	it("fails a font another origin serves, as a stylesheet url()", () => {
		const files = [
			page("en/index.html", LINK),
			asset("_astro/site.css", 'body{src:url("https://fonts.example.com/x.woff2")}'),
		]
		expect(codes(files)).toEqual(["REMOTE_FONT_URL_PRESENT", "FONT_FROM_ANOTHER_ORIGIN"])
	})

	it("fails a font URL that names the Site's own origin absolutely", () => {
		const html =
			'<html><head><link rel="preload" as="font" href="https://trajectonomics.com/fonts/aleo.woff2"></head></html>'
		expect(codes([{ path: "en/index.html", content: html }])).toEqual(["REMOTE_FONT_URL_PRESENT"])
	})

	it("fails a font embedded in a data: URL", () => {
		const html =
			'<html><head><style>@font-face{src:url("data:font/woff2;base64,d09GMg")}</style></head></html>'
		expect(codes([{ path: "en/index.html", content: html }])).toEqual(["DATA_FONT_URL_PRESENT"])
	})

	it("fails a stylesheet that asks for a font the build did not produce", () => {
		const files = [
			page("en/index.html", LINK),
			asset("_astro/site.css", 'body{src:url("/fonts/missing.woff2")}'),
		]
		const failures = checkFonts(files)
		expect(failures.map((failure) => failure.code)).toEqual(["FONT_FILE_MISSING"])
		expect(failures[0]?.path).toBe("fonts/missing.woff2")
	})

	it("reports one failure per rule, however many URLs a page carries", () => {
		const css =
			'@font-face{src:url("https://a.example.com/a.woff2")}@font-face{src:url("//b.example.com/b.woff2")}'
		expect(codes([page("en/index.html", `<style>${css}</style>`)])).toEqual([
			"REMOTE_FONT_URL_PRESENT",
			"FONT_FROM_ANOTHER_ORIGIN",
		])
	})

	it("fails a remote stylesheet that could declare a font", () => {
		const css = '@import url("https://fonts.googleapis.com/css2?family=Aleo");'
		expect(codes([page("en/index.html", `<style>${css}</style>`)])).toEqual([
			"REMOTE_FONT_URL_PRESENT",
			"FONT_FROM_ANOTHER_ORIGIN",
		])
	})

	it("ignores a URL that names no font", () => {
		const files = [
			page("en/index.html", LINK),
			asset("_astro/site.css", 'body{background:url("/bg.png")}'),
		]
		expect(codes(files)).toEqual([])
	})
})
