import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkNotFoundPages, NOT_FOUND_PAGES } from "./not-found-pages"

const NOINDEX = '<meta name="robots" content="noindex">'

function notFound(path: string, language: string, head = NOINDEX): BuiltFile {
	return {
		path,
		content: `<html lang="${language}"><head>${head}</head><body><nav></nav><main></main></body></html>`,
	}
}

/** Every Not-found page the build must produce, as the build produces it. */
function pages(): readonly BuiltFile[] {
	return NOT_FOUND_PAGES.map((page) => notFound(page.path, page.language))
}

function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkNotFoundPages(files).map((failure) => failure.code)
}

/** The build with every page, except that `page` stands in for the page at its own path. */
function build(page?: BuiltFile): readonly BuiltFile[] {
	return pages().map((built) => (page?.path === built.path ? page : built))
}

/** The first Not-found page, so a test can name the one it changes. */
function firstPage(): (typeof NOT_FOUND_PAGES)[number] {
	const page = NOT_FOUND_PAGES[0]
	if (page === undefined) throw new Error("the Site has no Not-found page")
	return page
}

describe("the Not-found pages", () => {
	it("passes a page per Locale URL and the root page, all not indexed", () => {
		expect(codes(pages())).toEqual([])
	})

	it("fails a build with no root Not-found page", () => {
		expect(codes(pages().filter((file) => file.path !== "404.html"))).toEqual([
			"NOT_FOUND_PAGE_MISSING",
		])
	})

	it("fails a build with no Not-found page under a Locale URL", () => {
		expect(codes(pages().filter((file) => file.path !== "th/404.html"))).toEqual([
			"NOT_FOUND_PAGE_MISSING",
		])
	})

	it("fails a Not-found page that asks to be indexed", () => {
		const page = firstPage()
		expect(codes(build(notFound(page.path, page.language, "")))).toEqual(["NOINDEX_MISSING"])
	})

	it("fails a Not-found page that advertises a canonical URL", () => {
		const page = firstPage()
		const canonical = `<link rel="canonical" href="https://trajectonomics.com${page.path}">`
		expect(codes(build(notFound(page.path, page.language, `${NOINDEX}${canonical}`)))).toEqual([
			"NOT_FOUND_HAS_CANONICAL",
		])
	})

	it("fails a Not-found page that advertises itself as a Language home", () => {
		const page = firstPage()
		const alternate = `<link rel="alternate" hreflang="${page.language}" href="/">`
		expect(codes(build(notFound(page.path, page.language, `${NOINDEX}${alternate}`)))).toEqual([
			"NOT_FOUND_HAS_HREFLANG",
		])
	})

	it("fails a Not-found page that marks a Language as the current page", () => {
		const page = firstPage()
		const current = `<a href="/en/" aria-current="page">EN</a>`
		const content = `<html lang="${page.language}"><head>${NOINDEX}</head><body><nav>${current}</nav><main></main></body></html>`
		expect(codes(build({ path: page.path, content }))).toEqual(["NOT_FOUND_HAS_CURRENT"])
	})

	it("fails a Not-found page that declares a Language other than its own", () => {
		const page = firstPage()
		expect(codes(build(notFound(page.path, "xx")))).toEqual(["LANGUAGE_NOT_DECLARED"])
	})
})
