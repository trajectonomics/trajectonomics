import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkExternalResources } from "./external-resources"

function page(html: string): readonly BuiltFile[] {
	return [{ path: "index.html", content: `<html><head></head><body>${html}</body></html>` }]
}

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkExternalResources(files).map((failure) => failure.code)
}

describe("resources from another origin", () => {
	it("passes same-origin and relative assets", () => {
		const html =
			'<link rel="stylesheet" href="/_astro/site.css"><script src="/_astro/site.js"></script>'
		expect(codes(page(html))).toEqual([])
	})

	it("passes an absolute URL on the Site's own origin", () => {
		expect(codes(page('<script src="https://trajectonomics.com/app.js"></script>'))).toEqual([])
	})

	it("passes a link to another site, which is a link and not a resource", () => {
		expect(codes(page('<a href="https://github.com/trajectonomics">GitHub</a>'))).toEqual([])
	})

	it("fails a script from another origin", () => {
		expect(codes(page('<script src="https://cdn.example.com/app.js"></script>'))).toEqual([
			"EXTERNAL_RESOURCE_PRESENT",
		])
	})

	it("fails a stylesheet from another origin", () => {
		expect(
			codes(page('<link rel="stylesheet" href="https://fonts.example.com/site.css">')),
		).toEqual(["EXTERNAL_RESOURCE_PRESENT"])
	})

	it("fails a font from another origin", () => {
		const css =
			'@font-face { font-family: Site; src: url("https://fonts.example.com/site.woff2"); }'
		expect(codes([{ path: "_astro/site.css", content: css }])).toEqual([
			"EXTERNAL_RESOURCE_PRESENT",
		])
	})

	it("fails a stylesheet imported from another origin", () => {
		expect(
			codes([{ path: "_astro/site.css", content: '@import "https://cdn.example.com/a.css";' }]),
		).toEqual(["EXTERNAL_RESOURCE_PRESENT"])
	})
})
