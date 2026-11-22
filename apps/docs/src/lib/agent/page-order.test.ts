import { describe, expect, test } from "bun:test"
import type { Root } from "fumadocs-core/page-tree"
import { sidebarPageUrls } from "./page-order"

/** A Docs sidebar with the Tab's own page first, a nested folder with an index, a separator and an external link. */
const TREE: Root = {
	type: "root",
	name: "Docs",
	children: [
		{
			type: "folder",
			name: "CLI & Quickstart",
			children: [
				{ type: "page", name: "Quickstart", url: "/cli" },
				{ type: "page", name: "Installation", url: "/cli/installation" },
				{
					type: "folder",
					name: "Commands",
					index: { type: "page", name: "Commands", url: "/cli/commands" },
					children: [{ type: "page", name: "tx", url: "/cli/commands/tx" }],
				},
			],
		},
		{ type: "separator", name: "Elsewhere" },
		{
			type: "page",
			name: "Source",
			url: "https://github.com/trajectonomics/trajectonomics",
			external: true,
		},
		{
			type: "folder",
			name: "Contribute",
			children: [{ type: "page", name: "Get started", url: "/contribute" }],
		},
	],
}

describe("the order the Docs sidebar presents its pages in", () => {
	test("a page comes in its folder's place, and a nested folder's index page precedes its children", () => {
		expect(sidebarPageUrls(TREE)).toEqual([
			"/cli",
			"/cli/installation",
			"/cli/commands",
			"/cli/commands/tx",
			"/contribute",
		])
	})

	test("a separator and an external link are not Docs pages", () => {
		expect(sidebarPageUrls(TREE)).not.toContain("https://github.com/trajectonomics/trajectonomics")
	})

	test("the order is frozen, so no caller can reorder the Tabs it came from", () => {
		expect(Object.isFrozen(sidebarPageUrls(TREE))).toBe(true)
	})
})
