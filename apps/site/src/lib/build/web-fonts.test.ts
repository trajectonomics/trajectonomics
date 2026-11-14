import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkNoWebFonts } from "./web-fonts"

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkNoWebFonts(files).map((failure) => failure.code)
}

describe("the web fonts the Site downloads", () => {
	const pass: readonly BuiltFile[] = [
		{ path: "en/index.html", content: "<html><head></head></html>" },
		{
			path: "_astro/site.css",
			content: "body{font-family:system-ui,Thonburi,Sukhumvit Set,sans-serif}",
		},
	]

	it("passes a build whose type comes from the visitor's own fonts", () => {
		expect(codes(pass)).toEqual([])
	})

	it("fails a build that shipped a font file", () => {
		expect(codes([{ path: "_astro/inter.woff2", content: "wOF2" }])).toEqual(["FONT_FILE_PRESENT"])
	})

	it("fails a stylesheet that declares a font face", () => {
		const css = '@font-face{font-family:Site;src:url("/_astro/site.woff2")}'
		expect(codes([{ path: "_astro/site.css", content: css }])).toEqual(["FONT_FACE_PRESENT"])
	})

	it("fails a font URL on another origin, as a preload", () => {
		const html =
			'<html><head><link rel="preload" as="font" href="https://fonts.example.com/x.woff2"></head></html>'
		expect(codes([{ path: "en/index.html", content: html }])).toEqual(["REMOTE_FONT_URL_PRESENT"])
	})

	it("fails a font URL on another origin, as a stylesheet url()", () => {
		const css = 'body{background-image:url("https://cdn.example.com/type.woff2")}'
		expect(codes([{ path: "_astro/site.css", content: css }])).toEqual(["REMOTE_FONT_URL_PRESENT"])
	})

	it("fails a font embedded in a data: URL", () => {
		const html =
			'<html><head><style>@font-face{font-family:Site;src:url("data:font/woff2;base64,d09GMg")}</style></head></html>'
		expect(codes([{ path: "en/index.html", content: html }])).toEqual([
			"FONT_FACE_PRESENT",
			"DATA_FONT_URL_PRESENT",
		])
	})

	it("reports one failure per rule for a file, however many URLs it carries", () => {
		const css =
			'@font-face{font-family:A;src:url("https://a.example.com/a.woff2")}@font-face{font-family:B;src:url("https://b.example.com/b.woff2")}'
		expect(codes([{ path: "_astro/site.css", content: css }])).toEqual([
			"FONT_FACE_PRESENT",
			"REMOTE_FONT_URL_PRESENT",
		])
	})
})
