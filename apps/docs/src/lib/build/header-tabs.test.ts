import { describe, expect, test } from "bun:test"
import { TABS, type TabDefinition, tabUrl } from "../tabs"
import type { BuiltFile } from "./built-files"
import { checkHeaderTabs } from "./header-tabs"
import { LANDING_PAGE_FILE } from "./landing-page"

const OPERATOR = TABS[0]
const BUILDER = TABS[1]
const OPERATOR_PAGE = "cli/index.html"
const CONTRIBUTE_PAGE = "contribute/index.html"

/** A Tab link, marked as the current page only when it is `current`. */
function tabLink(tab: TabDefinition, current: TabDefinition | undefined): string {
	const marked = tab === current ? ' aria-current="page"' : ""
	return `<a href="${tabUrl(tab)}"${marked}>${tab.audience}</a>`
}

/** A page whose header has both Tabs, with `current` marked. */
function page(path: string, current: TabDefinition | undefined): BuiltFile {
	return {
		path,
		content: `<header id="nd-subnav">${tabLink(OPERATOR, current)}${tabLink(BUILDER, current)}</header>`,
	}
}

/** The Landing Page's home-layout header with both Tabs, `current` marked when one is. */
function landingPage(current?: TabDefinition): BuiltFile {
	return {
		path: LANDING_PAGE_FILE,
		content: `<header id="nd-nav">${tabLink(OPERATOR, current)}${tabLink(BUILDER, current)}</header>`,
	}
}

function codesOf(files: readonly BuiltFile[]): readonly string[] {
	return checkHeaderTabs(files).map((failure) => failure.code)
}

describe("header Tabs of a built Tab page", () => {
	test("both Tab pages with both Tabs in the header report no failure", () => {
		expect(codesOf([page(OPERATOR_PAGE, OPERATOR), page(CONTRIBUTE_PAGE, BUILDER)])).toEqual([])
	})

	test("a header without a link to a Tab is reported as HEADER_TAB_LINK_MISSING", () => {
		const content = `<header id="nd-subnav">${tabLink(OPERATOR, OPERATOR)}</header>`
		expect(codesOf([{ path: OPERATOR_PAGE, content }])).toEqual(["HEADER_TAB_LINK_MISSING"])
	})

	test("a page without a header reports every missing Tab link", () => {
		expect(codesOf([{ path: OPERATOR_PAGE, content: "<main></main>" }])).toEqual([
			"HEADER_TAB_LINK_MISSING",
			"HEADER_TAB_LINK_MISSING",
		])
	})

	test("a current Tab without aria-current is reported as HEADER_TAB_NOT_CURRENT", () => {
		expect(codesOf([page(OPERATOR_PAGE, undefined)])).toEqual(["HEADER_TAB_NOT_CURRENT"])
	})

	test("a non-current Tab marked as current is reported as HEADER_TAB_OTHER_CURRENT", () => {
		const content = `<header id="nd-subnav">${tabLink(OPERATOR, OPERATOR)}${tabLink(BUILDER, BUILDER)}</header>`
		expect(codesOf([{ path: OPERATOR_PAGE, content }])).toEqual(["HEADER_TAB_OTHER_CURRENT"])
	})

	test("Tab links outside the header do not count as header Tabs", () => {
		const content = [
			'<header id="nd-subnav"></header>',
			'<aside id="nd-sidebar">',
			tabLink(OPERATOR, OPERATOR),
			tabLink(BUILDER, OPERATOR),
			"</aside>",
		].join("")
		expect(codesOf([{ path: OPERATOR_PAGE, content }])).toEqual([
			"HEADER_TAB_LINK_MISSING",
			"HEADER_TAB_LINK_MISSING",
		])
	})

	test("a Tab page the build did not produce is left to the required-page check", () => {
		expect(codesOf([page(OPERATOR_PAGE, OPERATOR)])).toEqual([])
	})
})

describe("header Tabs of the built Landing Page", () => {
	test("both Tabs with neither current report no failure", () => {
		expect(codesOf([landingPage()])).toEqual([])
	})

	test("a header without a link to a Tab is reported as HEADER_TAB_LINK_MISSING", () => {
		const content = `<header id="nd-nav">${tabLink(OPERATOR, undefined)}</header>`
		expect(codesOf([{ path: LANDING_PAGE_FILE, content }])).toEqual(["HEADER_TAB_LINK_MISSING"])
	})

	test("a Tab marked current on the Landing Page is reported as HEADER_TAB_OTHER_CURRENT", () => {
		expect(codesOf([landingPage(OPERATOR)])).toEqual(["HEADER_TAB_OTHER_CURRENT"])
	})

	test("Tab links outside the header do not count as header Tabs", () => {
		const content = [
			'<header id="nd-nav"></header>',
			`<main id="nd-home-layout">${tabLink(OPERATOR, undefined)}${tabLink(BUILDER, undefined)}</main>`,
		].join("")
		expect(codesOf([{ path: LANDING_PAGE_FILE, content }])).toEqual([
			"HEADER_TAB_LINK_MISSING",
			"HEADER_TAB_LINK_MISSING",
		])
	})
})
