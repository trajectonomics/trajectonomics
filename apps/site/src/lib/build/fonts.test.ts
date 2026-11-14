import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkNoDownloadedFonts } from "./fonts"

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkNoDownloadedFonts(files).map((failure) => failure.code)
}

describe("the fonts the Site downloads", () => {
	it("passes a build whose type comes from the system", () => {
		const files: readonly BuiltFile[] = [
			{ path: "index.html", content: "<html><head></head></html>" },
			{
				path: "_astro/site.css",
				content: "body{font-family:system-ui,Thonburi,Sukhumvit Set,sans-serif}",
			},
		]
		expect(codes(files)).toEqual([])
	})

	it("fails a build that shipped a font file", () => {
		expect(codes([{ path: "_astro/inter.woff2", content: "wOF2" }])).toEqual(["FONT_FILE_PRESENT"])
	})

	it("fails a stylesheet that declares a font face, which downloads one", () => {
		const css = '@font-face{font-family:Site;src:url("/_astro/site.woff2")}'
		expect(codes([{ path: "_astro/site.css", content: css }])).toEqual(["FONT_FACE_PRESENT"])
	})
})
