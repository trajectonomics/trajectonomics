import { describe, expect, test } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkLandingPage, LANDING_PAGE_FILE } from "./landing-page"
import { SEARCH_INDEX_FILE } from "./search-index"

const OPERATOR_LINK = '<a href="/docs/cli/">Use traj: install it and get your first answer</a>'
const CONTRIBUTE_LINK =
	'<a href="/docs/contribute/">For Contributors: help make the tax rules right</a>'

function landingPage(body: string, head = ""): BuiltFile {
	return {
		path: LANDING_PAGE_FILE,
		content: `<!doctype html><head><title>Docs</title>${head}</head><body>${body}</body>`,
	}
}

function searchIndex(pageIds: readonly string[]): BuiltFile {
	const docs = Object.fromEntries(
		pageIds.map((pageId, position) => [String(position), { page_id: pageId, type: "page" }]),
	)
	return {
		path: SEARCH_INDEX_FILE,
		content: JSON.stringify({
			type: "advanced",
			internalDocumentIDStore: { internalIdToId: pageIds },
			docs: { count: pageIds.length, docs },
		}),
	}
}

/** The Landing Page body around its Tab links and the release line, when the build has one. */
function landingBody(links: string, line = ""): string {
	return `<main>${links}${line}</main>`
}

function codesOf(files: readonly BuiltFile[], releaseLine?: string): readonly string[] {
	return checkLandingPage(files, releaseLine).map((failure) => failure.code)
}

const RELEASE_LINE = "Docs for traj 0.4.0"

const TWO_ENTRIES = landingBody(`${OPERATOR_LINK}${CONTRIBUTE_LINK}`, `<p>${RELEASE_LINE}</p>`)

describe("the built Landing Page", () => {
	test("a page with one link to each Tab and no redirect reports no failure", () => {
		expect(codesOf([landingPage(TWO_ENTRIES), searchIndex(["/docs/cli"])], RELEASE_LINE)).toEqual(
			[],
		)
	})

	test("a page that is a meta refresh is reported as LANDING_PAGE_REDIRECT", () => {
		const stub = landingPage(TWO_ENTRIES, '<meta http-equiv="refresh" content="0;url=/docs/cli/">')

		expect(codesOf([stub])).toEqual(["LANDING_PAGE_REDIRECT"])
	})

	test("a page missing the link to a Tab is reported as LANDING_PAGE_LINKS", () => {
		expect(codesOf([landingPage(landingBody(OPERATOR_LINK))])).toEqual(["LANDING_PAGE_LINKS"])
	})

	test("a page with a third link into a Tab is reported as LANDING_PAGE_LINKS", () => {
		const extra = '<a href="/docs/cli/installation/">Installation</a>'

		expect(
			codesOf([landingPage(landingBody(`${OPERATOR_LINK}${CONTRIBUTE_LINK}${extra}`))]),
		).toEqual(["LANDING_PAGE_LINKS"])
	})

	test("the same Tab linked twice is reported as LANDING_PAGE_LINKS", () => {
		expect(codesOf([landingPage(landingBody(`${OPERATOR_LINK}${OPERATOR_LINK}`))])).toEqual([
			"LANDING_PAGE_LINKS",
		])
	})

	test("links that are not into a Tab, such as the header title, do not count", () => {
		const title = '<a href="/">Trajectonomics Docs</a>'

		expect(codesOf([landingPage(`<header>${title}</header>${TWO_ENTRIES}`)])).toEqual([])
	})

	test("a search index with an entry for the Landing Page is reported as LANDING_PAGE_INDEXED", () => {
		expect(codesOf([landingPage(TWO_ENTRIES), searchIndex(["/docs/cli", "/docs/"])])).toEqual([
			"LANDING_PAGE_INDEXED",
		])
	})

	test("a search index with the landing page id is reported as LANDING_PAGE_INDEXED", () => {
		expect(codesOf([landingPage(TWO_ENTRIES), searchIndex(["/docs"])])).toEqual([
			"LANDING_PAGE_INDEXED",
		])
	})

	test("a page that does not state the release line is reported as LANDING_PAGE_RELEASE_LINE", () => {
		const bare = landingPage(landingBody(`${OPERATOR_LINK}${CONTRIBUTE_LINK}`))

		expect(codesOf([bare], RELEASE_LINE)).toEqual(["LANDING_PAGE_RELEASE_LINE"])
	})

	test("a page that states another release is reported as LANDING_PAGE_RELEASE_LINE", () => {
		const stale = landingPage(
			landingBody(`${OPERATOR_LINK}${CONTRIBUTE_LINK}`, "<p>Docs for traj 0.3.0</p>"),
		)

		expect(codesOf([stale], RELEASE_LINE)).toEqual(["LANDING_PAGE_RELEASE_LINE"])
	})

	test("a build with no release line, as in a shallow clone, requires no line", () => {
		const bare = landingPage(landingBody(`${OPERATOR_LINK}${CONTRIBUTE_LINK}`))

		expect(codesOf([bare])).toEqual([])
	})

	test("a missing page is left to the required-pages check", () => {
		expect(codesOf([searchIndex(["/docs/cli"])])).toEqual([])
	})
})
