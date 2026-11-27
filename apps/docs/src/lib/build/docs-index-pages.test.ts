import { describe, expect, test } from "bun:test"
import { PORTAL_ORIGIN } from "../site"
import type { BuiltFile } from "./built-files"
import { DOCS_INDEX_FILE } from "./docs-index-file"
import { checkDocsIndexPages } from "./docs-index-pages"

const PAGES = ["index.html", "cli/index.html", "cli/commands/tx/index.html"]

const TWINS = ["index.md", "cli.md", "cli/commands/tx.md"]

const ENTRIES = [
	["Trajectonomics Docs", `${PORTAL_ORIGIN}/index.md`],
	["Quickstart", `${PORTAL_ORIGIN}/cli.md`],
	["tx", `${PORTAL_ORIGIN}/cli/commands/tx.md`],
] as const

function page(path: string): BuiltFile {
	return { path, content: "<!doctype html><title>A page</title>" }
}

function twin(path: string): BuiltFile {
	return { path, content: "# A twin\n" }
}

function docsIndex(entries: readonly (readonly [string, string])[]): BuiltFile {
	return {
		path: DOCS_INDEX_FILE,
		content: [
			"# Trajectonomics Docs",
			"",
			...entries.map(([title, url]) => `- [${title}](${url})`),
			"",
		].join("\n"),
	}
}

/** A build with a page and a twin for every index entry. */
const COMPLETE_BUILD: readonly BuiltFile[] = [
	...PAGES.map(page),
	...TWINS.map(twin),
	docsIndex(ENTRIES),
]

describe("the Docs index's coverage of the built pages", () => {
	test("an entry for every built page's twin reports no failure", () => {
		expect(checkDocsIndexPages(COMPLETE_BUILD)).toEqual([])
	})

	test("a page missing from the index is reported as DOCS_INDEX_PAGE_MISSING", () => {
		const files = [
			...COMPLETE_BUILD.filter((file) => file.path !== DOCS_INDEX_FILE),
			docsIndex([ENTRIES[0], ENTRIES[2]]),
		]

		const failures = checkDocsIndexPages(files)
		expect(failures.map((failure) => failure.code)).toEqual(["DOCS_INDEX_PAGE_MISSING"])
		expect(failures[0]?.message).toContain("/docs/cli/")
	})

	test("the Landing Page is covered by the same rule as every content page", () => {
		const files = [
			...COMPLETE_BUILD.filter((file) => file.path !== DOCS_INDEX_FILE),
			docsIndex([ENTRIES[1], ENTRIES[2]]),
		]

		const failures = checkDocsIndexPages(files)
		expect(failures.map((failure) => failure.code)).toEqual(["DOCS_INDEX_PAGE_MISSING"])
		expect(failures[0]?.message).toContain("/index.md")
	})

	test("a page added without touching the index fails, because the page list comes from the build", () => {
		const files = [...COMPLETE_BUILD, page("cli/new/index.html"), twin("cli/new.md")]

		expect(checkDocsIndexPages(files).map((failure) => failure.code)).toEqual([
			"DOCS_INDEX_PAGE_MISSING",
		])
	})

	test("an index entry with no twin is reported as TWIN_MISSING", () => {
		const files = COMPLETE_BUILD.filter((file) => file.path !== "cli/commands/tx.md")

		const failures = checkDocsIndexPages(files)
		expect(failures.map((failure) => failure.code)).toEqual(["TWIN_MISSING"])
		expect(failures[0]?.message).toContain("/cli/commands/tx.md")
	})

	test("a twin the index lists twice is reported as DOCS_INDEX_PAGE_DUPLICATE", () => {
		const files = [
			...COMPLETE_BUILD.filter((file) => file.path !== DOCS_INDEX_FILE),
			docsIndex([...ENTRIES, ENTRIES[2]]),
		]

		expect(checkDocsIndexPages(files).map((failure) => failure.code)).toEqual([
			"DOCS_INDEX_PAGE_DUPLICATE",
		])
	})

	test("a bullet that names no Markdown twin on the Portal is reported as DOCS_INDEX_LINK_UNEXPECTED", () => {
		const files = [
			...COMPLETE_BUILD.filter((file) => file.path !== DOCS_INDEX_FILE),
			docsIndex([...ENTRIES, ["Elsewhere", "https://example.com/readme.md"]]),
		]

		const failures = checkDocsIndexPages(files)
		expect(failures.map((failure) => failure.code)).toEqual(["DOCS_INDEX_LINK_UNEXPECTED"])
		expect(failures[0]?.message).toContain("https://example.com/readme.md")
	})

	test("a relative twin URL is unexpected, because the index is read away from the Portal", () => {
		const files = [
			...COMPLETE_BUILD.filter((file) => file.path !== DOCS_INDEX_FILE),
			docsIndex([...ENTRIES, ["Relative", "/cli.md"]]),
		]

		expect(checkDocsIndexPages(files).map((failure) => failure.code)).toEqual([
			"DOCS_INDEX_LINK_UNEXPECTED",
		])
	})

	test("a build with no Docs index is reported as DOCS_INDEX_MISSING", () => {
		const files = COMPLETE_BUILD.filter((file) => file.path !== DOCS_INDEX_FILE)

		expect(checkDocsIndexPages(files).map((failure) => failure.code)).toEqual([
			"DOCS_INDEX_MISSING",
		])
	})

	test("a file that is not an llmstxt.org document is reported as DOCS_INDEX_INVALID", () => {
		const files = [
			...COMPLETE_BUILD.filter((file) => file.path !== DOCS_INDEX_FILE),
			{ path: DOCS_INDEX_FILE, content: "<html></html>" },
		]

		expect(checkDocsIndexPages(files).map((failure) => failure.code)).toEqual([
			"DOCS_INDEX_INVALID",
		])
	})

	test("the 404 page and the audience aliases have no twin and are not required in the index", () => {
		const files = [
			...COMPLETE_BUILD,
			page("404.html"),
			{
				path: "operators/index.html",
				content: '<html><meta http-equiv="refresh" content="0;url=/docs/cli/"></html>',
			},
		]

		expect(checkDocsIndexPages(files)).toEqual([])
	})
})
