import { describe, expect, test } from "bun:test"
import type { BuiltFile } from "./built-files"
import { checkSidebarTitles } from "./sidebar-titles"

const PAGE = "cli/index.html"

function sidebarPage(links: string): BuiltFile {
	return { path: PAGE, content: `<aside id="nd-sidebar">${links}</aside>` }
}

function codesOf(files: readonly BuiltFile[]): readonly string[] {
	return checkSidebarTitles(files).map((failure) => failure.code)
}

describe("Tab titles in the built sidebar", () => {
	test("a sidebar of page titles reports no failure", () => {
		expect(
			codesOf([
				sidebarPage('<a href="/cli/">Quickstart</a><a href="/cli/installation/">Installation</a>'),
			]),
		).toEqual([])
	})

	test("a sidebar link whose text is a Tab title is reported as SIDEBAR_TAB_TITLE_LINK", () => {
		expect(codesOf([sidebarPage('<a href="/cli/">CLI &amp; Quickstart</a>')])).toEqual([
			"SIDEBAR_TAB_TITLE_LINK",
		])
	})

	test("a Tab title in a sidebar button is navigation, not a duplicated page title", () => {
		expect(codesOf([sidebarPage("<button>CLI &amp; Quickstart</button>")])).toEqual([])
	})

	test("a Tab title outside the sidebar does not count", () => {
		expect(
			codesOf([
				{
					path: PAGE,
					content:
						'<aside id="nd-sidebar"></aside><header id="nd-subnav"><a href="/cli/">CLI &amp; Quickstart</a></header>',
				},
			]),
		).toEqual([])
	})

	test("a page without a sidebar is left alone", () => {
		expect(codesOf([{ path: "404.html", content: "<main></main>" }])).toEqual([])
	})
})
