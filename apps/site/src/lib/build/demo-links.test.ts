import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkDemoLinks } from "./demo-links"

function codes(failures: readonly { code: string }[]): readonly string[] {
	return failures.map((failure) => failure.code)
}

function page(path: string, body: string): BuiltFile {
	return { path, content: `<html><body>${body}</body></html>` }
}

describe("the links of the Demo's pages", () => {
	it("passes a page whose links stay under /demo/, relative or root-relative", () => {
		expect(
			codes(
				checkDemoLinks([
					page(
						"demo/index.html",
						'<link rel="stylesheet" href="./_app/site.css"><a href="../demo/cash-flow/">Cash flow</a>',
					),
					page("demo/chance/index.html", '<a href="/demo/chance/path/">Path</a>'),
				]),
			),
		).toEqual([])
	})

	it("passes a fragment, which stays on the same page", () => {
		expect(codes(checkDemoLinks([page("demo/index.html", '<a href="#main">Main</a>')]))).toEqual([])
	})

	it("fails a relative link that climbs out of /demo/", () => {
		expect(
			codes(checkDemoLinks([page("demo/index.html", '<link href="../_app/site.css">')])),
		).toEqual(["DEMO_LINK_OUTSIDE"])
	})

	it("fails a root-relative link that points at the Site", () => {
		expect(codes(checkDemoLinks([page("demo/index.html", '<a href="/">Home</a>')]))).toEqual([
			"DEMO_LINK_OUTSIDE",
		])
	})

	it("fails a link to another origin", () => {
		expect(
			codes(
				checkDemoLinks([
					page("demo/index.html", '<script src="https://example.com/app.js"></script>'),
				]),
			),
		).toEqual(["DEMO_LINK_OUTSIDE"])
	})

	it("fails a form that posts outside the Demo", () => {
		expect(
			codes(checkDemoLinks([page("demo/index.html", '<form action="/upload"></form>')])),
		).toEqual(["DEMO_LINK_OUTSIDE"])
	})

	it("fails a srcset candidate that points outside the Demo", () => {
		expect(
			codes(
				checkDemoLinks([
					page("demo/index.html", '<img srcset="/demo/a.png 1x, /b.png 2x" src="/demo/a.png">'),
				]),
			),
		).toEqual(["DEMO_LINK_OUTSIDE"])
	})

	it("fails a meta refresh that sends the page outside the Demo", () => {
		expect(
			codes(
				checkDemoLinks([
					page("demo/index.html", '<meta http-equiv="refresh" content="0; url=/outside">'),
				]),
			),
		).toEqual(["DEMO_LINK_OUTSIDE"])
	})

	it("fails a meta refresh that names a URL without url=", () => {
		expect(
			codes(
				checkDemoLinks([
					page("demo/index.html", '<meta http-equiv="refresh" content="0; /outside">'),
				]),
			),
		).toEqual(["DEMO_LINK_OUTSIDE"])
	})

	it("fails a comma-separated meta refresh that leaves the Demo", () => {
		expect(
			codes(
				checkDemoLinks([
					page("demo/index.html", '<meta http-equiv="refresh" content="0, /outside">'),
				]),
			),
		).toEqual(["DEMO_LINK_OUTSIDE"])
	})

	it("fails a meta refresh whose URL quote is unclosed", () => {
		expect(
			codes(
				checkDemoLinks([
					page("demo/index.html", `<meta http-equiv="refresh" content="0; url='/outside">`),
				]),
			),
		).toEqual(["DEMO_LINK_OUTSIDE"])
	})

	it("fails a link imagesrcset candidate that points outside the Demo", () => {
		expect(
			codes(
				checkDemoLinks([
					page("demo/index.html", '<link rel="preload" imagesrcset="/demo/a.png 1x, /b.png 2x">'),
				]),
			),
		).toEqual(["DEMO_LINK_OUTSIDE"])
	})

	it("passes a link imagesrcset and uppercase attributes that stay under /demo/", () => {
		expect(
			codes(
				checkDemoLinks([
					page(
						"demo/index.html",
						'<link rel="preload" imagesrcset="/demo/a.png 1x, /demo/b.png 2x"><A HREF="/demo/">Home</A>',
					),
				]),
			),
		).toEqual([])
	})

	it("fails an uppercase attribute that points outside the Demo", () => {
		expect(codes(checkDemoLinks([page("demo/index.html", '<A HREF="/">Home</A>')]))).toEqual([
			"DEMO_LINK_OUTSIDE",
		])
	})

	it("fails an SVG use whose href leaves the Demo", () => {
		expect(
			codes(
				checkDemoLinks([
					page(
						"demo/index.html",
						'<svg><use href="https://example.com/icons.svg#icon"></use></svg>',
					),
				]),
			),
		).toEqual(["DEMO_LINK_OUTSIDE"])
	})

	it("fails a formaction that submits outside the Demo", () => {
		expect(
			codes(checkDemoLinks([page("demo/index.html", '<button formaction="/upload">Go</button>')])),
		).toEqual(["DEMO_LINK_OUTSIDE"])
	})
})
