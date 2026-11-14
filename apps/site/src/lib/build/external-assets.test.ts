import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkExternalAssets } from "./external-assets"

function page(html: string): readonly BuiltFile[] {
	return [{ path: "index.html", content: `<html><head></head><body>${html}</body></html>` }]
}

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkExternalAssets(files).map((failure) => failure.code)
}

describe("assets from another origin", () => {
	it("passes root-relative and relative assets", () => {
		const html = '<link rel="stylesheet" href="/_astro/site.css"><script src="site.js"></script>'
		expect(codes(page(html))).toEqual([])
	})

	it("passes an inline script and a link to another site", () => {
		const html =
			'<script>const answer = 42</script><a href="https://github.com/trajectonomics">GitHub</a>'
		expect(codes(page(html))).toEqual([])
	})

	it("fails an absolute URL even on the Site's own origin, because the Site loads none", () => {
		expect(codes(page('<script src="https://trajectonomics.com/app.js"></script>'))).toEqual([
			"EXTERNAL_ASSET",
		])
	})

	it("fails a script from another origin", () => {
		expect(codes(page('<script src="https://cdn.example.com/app.js"></script>'))).toEqual([
			"EXTERNAL_ASSET",
		])
	})

	it("fails a stylesheet from another origin, whatever the scheme's case", () => {
		expect(
			codes(page('<link rel="stylesheet" href="HTTPS://fonts.example.com/site.css">')),
		).toEqual(["EXTERNAL_ASSET"])
	})

	it("fails a protocol-relative script", () => {
		expect(codes(page('<script src="//cdn.example.com/app.js"></script>'))).toEqual([
			"EXTERNAL_ASSET",
		])
	})

	it("fails an external preload of a script or a style", () => {
		const html =
			'<link rel="preload" as="style" href="https://cdn.example.com/site.css"><link rel="modulepreload" href="https://cdn.example.com/site.js">'
		expect(codes(page(html))).toEqual(["EXTERNAL_ASSET", "EXTERNAL_ASSET"])
	})

	it("does not count a resource a script only names", () => {
		const html =
			'<script>const tpl = \'<link rel="stylesheet" href="https://cdn.example.com/site.css">\'</script>'
		expect(codes(page(html))).toEqual([])
	})
})
