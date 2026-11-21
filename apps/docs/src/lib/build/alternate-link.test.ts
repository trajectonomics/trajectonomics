import { describe, expect, test } from "bun:test"
import { checkAlternateLinks } from "./alternate-link"
import type { BuiltFile } from "./built-files"

/** The head link that names a page's Markdown twin. */
const ALTERNATE = '<link rel="alternate" type="text/markdown" href="/cli.md">'

/** One built page with a twin, and the alternate link in or outside its head. */
function page(path: string, link: string | null = ALTERNATE): BuiltFile {
	return {
		path,
		content: `<html><head>${link ?? ""}</head><body><h1>Quickstart</h1></body></html>`,
	}
}

describe("the alternate Markdown link of a built page", () => {
	test("a page whose head names its twin reports no failure", () => {
		expect(checkAlternateLinks([page("cli/index.html")])).toEqual([])
	})

	test("a page whose head has no alternate Markdown link is reported as ALTERNATE_LINK_MISSING", () => {
		expect(
			checkAlternateLinks([page("cli/index.html", null)]).map((failure) => failure.code),
		).toEqual(["ALTERNATE_LINK_MISSING"])
	})

	test("an alternate link outside the head does not count", () => {
		const built = page("cli/index.html", null)
		const content = built.content.replace("<body>", `<body>${ALTERNATE}`)

		expect(checkAlternateLinks([{ ...built, content }]).map((failure) => failure.code)).toEqual([
			"ALTERNATE_LINK_MISSING",
		])
	})

	test("a link to another twin does not count", () => {
		const link = '<link rel="alternate" type="text/markdown" href="/contribute.md">'

		expect(
			checkAlternateLinks([page("cli/index.html", link)]).map((failure) => failure.code),
		).toEqual(["ALTERNATE_LINK_MISSING"])
	})

	test("the 404 page and the audience aliases have no twin and carry no alternate link", () => {
		const files: readonly BuiltFile[] = [
			page("cli/index.html"),
			{ path: "404.html", content: "<html><body><h1>Page not found</h1></body></html>" },
			{
				path: "operators/index.html",
				content: '<html><meta http-equiv="refresh" content="0;url=/cli/"></html>',
			},
		]

		expect(checkAlternateLinks(files)).toEqual([])
	})
})
