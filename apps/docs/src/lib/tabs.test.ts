import { describe, expect, test } from "bun:test"
import { isTabPath, TAB_ALIASES, TABS, tabUrl } from "./tabs"

describe("Docs Portal Tabs", () => {
	test("there is one Operator tab and one Contribute tab, in that order", () => {
		expect(TABS.map((tab) => tab.audience)).toEqual(["Operator", "Contributor"])
	})

	test("the Operator tab lives at /docs/cli/ and the Contribute tab at /docs/contribute/", () => {
		expect(TABS.map(tabUrl)).toEqual(["/docs/cli/", "/docs/contribute/"])
	})

	test("each Tab has a Landing Page entry naming its audience and what it is for", () => {
		expect(TABS.map((tab) => tab.entry)).toEqual([
			"For Operators: install and run the CLI",
			"For Contributors: help make the tax rules right",
		])
	})

	test("each Tab folder is a Fumadocs root folder titled as the Tab", async () => {
		for (const tab of TABS) {
			const meta = await Bun.file(`src/content/docs/${tab.folder}/meta.json`).json()
			expect(meta).toMatchObject({ title: tab.title, root: true })
		}
	})
})

describe("the Tab a pathname belongs to", () => {
	test("a Tab's index page belongs to that Tab", () => {
		expect(isTabPath(TABS[0], "/docs/cli/")).toBe(true)
		expect(isTabPath(TABS[1], "/docs/contribute/")).toBe(true)
	})

	test("a Tab's index page belongs to that Tab before its trailing slash is added", () => {
		expect(isTabPath(TABS[0], "/docs/cli")).toBe(true)
		expect(isTabPath(TABS[1], "/docs/contribute")).toBe(true)
	})

	test("a page under a Tab belongs to that Tab", () => {
		expect(isTabPath(TABS[0], "/docs/cli/installation/")).toBe(true)
		expect(isTabPath(TABS[1], "/docs/contribute/sim-core/")).toBe(true)
	})

	test("another Tab's pages do not belong to this Tab", () => {
		expect(isTabPath(TABS[0], "/docs/contribute/")).toBe(false)
		expect(isTabPath(TABS[0], "/docs/contribute/sim-core/")).toBe(false)
	})

	test("the Landing Page belongs to no Tab", () => {
		expect(isTabPath(TABS[0], "/docs/")).toBe(false)
		expect(isTabPath(TABS[1], "/docs/")).toBe(false)
	})

	test("a path that only starts with a Tab's name is another page", () => {
		expect(isTabPath(TABS[0], "/docs/cli-reference/")).toBe(false)
	})
})

describe("the audience names a Tab answers to", () => {
	test("each alias sends its audience name to that Tab's index page", () => {
		expect(TAB_ALIASES.map((alias) => [alias.path, tabUrl(alias.tab)])).toEqual([
			["/operators", "/docs/cli/"],
			["/contributors", "/docs/contribute/"],
			["/builders", "/docs/contribute/"],
		])
	})

	test("an alias is not a Tab path of its own", () => {
		for (const alias of TAB_ALIASES) {
			expect(TABS.some((tab) => isTabPath(tab, alias.path))).toBe(false)
		}
	})
})
