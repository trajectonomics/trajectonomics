import { describe, expect, test } from "bun:test"
import type { BuiltFile } from "./built-files"
import { SEARCH_INDEX_FILE } from "./search-index"
import { checkSearchIndexPages } from "./search-index-pages"

const CONTENT_PAGES = ["cli/index.html", "cli/commands/index.html", "contribute/index.html"]

function page(path: string): BuiltFile {
	return { path, content: "<!doctype html><title>A page</title>" }
}

function searchIndexFile(content: string): BuiltFile {
	return { path: SEARCH_INDEX_FILE, content }
}

function indexedAt(pageIds: readonly string[]): BuiltFile {
	const docs = Object.fromEntries(
		pageIds.map((pageId, position) => [String(position), { page_id: pageId, type: "page" }]),
	)
	return searchIndexFile(
		JSON.stringify({
			type: "advanced",
			internalDocumentIDStore: { internalIdToId: pageIds },
			docs: { count: pageIds.length, docs },
		}),
	)
}

const INDEXED_PAGES = ["/cli", "/cli/commands", "/contribute"]

describe("the search index's coverage of the built content pages", () => {
	test("an entry for every content page reports no failure", () => {
		const files = [...CONTENT_PAGES.map(page), indexedAt(INDEXED_PAGES)]

		expect(checkSearchIndexPages(files)).toEqual([])
	})

	test("a built content page with no page entry is reported as SEARCH_INDEX_PAGE_MISSING", () => {
		const files = [...CONTENT_PAGES.map(page), indexedAt(["/cli", "/contribute"])]

		const failures = checkSearchIndexPages(files)
		expect(failures.map((failure) => failure.code)).toEqual(["SEARCH_INDEX_PAGE_MISSING"])
		expect(failures[0]?.message).toContain("/cli/commands")
	})

	test("the page list is read from the build, so a new content page must be indexed", () => {
		const files = [
			...CONTENT_PAGES.map(page),
			page("contribute/sim-core/index.html"),
			indexedAt(INDEXED_PAGES),
		]

		expect(checkSearchIndexPages(files).map((failure) => failure.path)).toEqual([SEARCH_INDEX_FILE])
	})

	test("the 404 page and the Landing Page are not required in the index", () => {
		const files = [
			...CONTENT_PAGES.map(page),
			page("404.html"),
			page("index.html"),
			indexedAt(INDEXED_PAGES),
		]

		expect(checkSearchIndexPages(files)).toEqual([])
	})

	test("with no search index the missing-index check owns the failure", () => {
		expect(checkSearchIndexPages(CONTENT_PAGES.map(page))).toEqual([])
	})
})
