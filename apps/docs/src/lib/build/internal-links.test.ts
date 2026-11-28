import { describe, expect, test } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkInternalLinks } from "./internal-links"

const PAGE = "cli/index.html"

function page(links: string): BuiltFile {
	return { path: PAGE, content: `<main>${links}</main>` }
}

function hrefsOf(files: readonly BuiltFile[]): readonly string[] {
	return checkInternalLinks(files).map((failure) => failure.message)
}

describe("Portal links in the built pages", () => {
	test("a page whose links end with a slash reports no failure", () => {
		expect(
			hrefsOf([
				page('<a href="/docs/cli/">Quickstart</a><a href="/docs/cli/agent/#ask">Agent</a>'),
			]),
		).toEqual([])
	})

	test("a Portal page link without its trailing slash is reported", () => {
		expect(hrefsOf([page('<a href="/docs/cli/agent">Agent</a>')])).toEqual([
			"the page links /docs/cli/agent without its trailing slash, so the click costs a 307 redirect",
		])
	})

	test("the base path itself needs its slash", () => {
		expect(hrefsOf([page('<a href="/docs">Docs</a>')])).toEqual([
			"the page links /docs without its trailing slash, so the click costs a 307 redirect",
		])
	})

	test("a query or fragment follows the slash, so its absence is still reported", () => {
		expect(hrefsOf([page('<a href="/docs/cli?tab=1#install">CLI</a>')])).toEqual([
			"the page links /docs/cli?tab=1#install without its trailing slash, so the click costs a 307 redirect",
		])
	})

	test.each([
		["/docs/llms.txt"],
		["/docs/sitemap.xml"],
		["/docs/api/search.json"],
		["/docs/cli.md"],
	])("a file the Portal serves as it is stays untouched: %s", (href) => {
		expect(hrefsOf([page(`<a href="${href}">File</a>`)])).toEqual([])
	})

	test.each([["/blog/launch/"], ["/data/"], ["/"], ["https://example.com/docs/cli"]])(
		"a link outside the Portal stays untouched: %s",
		(href) => {
			expect(hrefsOf([page(`<a href="${href}">Elsewhere</a>`)])).toEqual([])
		},
	)

	test("the same slashless link in one page is reported once", () => {
		expect(hrefsOf([page('<a href="/docs/cli">One</a><a href="/docs/cli">Two</a>')]).length).toBe(1)
	})

	test("a file that is not a page is left alone", () => {
		expect(hrefsOf([{ path: "sitemap.xml", content: '<a href="/docs/cli">CLI</a>' }])).toEqual([])
	})
})
