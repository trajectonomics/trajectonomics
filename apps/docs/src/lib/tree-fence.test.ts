import { describe, expect, test } from "bun:test"
import type { HastNode } from "./hast"
import { parseTree, treeFences } from "./tree-fence"

/** A `pre` around a code element with a language class, as the MDX pipeline hands it over. */
function fence(language: string, body: string): HastNode {
	return {
		type: "element",
		tagName: "pre",
		children: [
			{
				type: "element",
				tagName: "code",
				properties: { className: [`language-${language}`] },
				children: [{ type: "text", value: body }],
			},
		],
	}
}

/** Run the plugin over one node, returning its replacement. */
function run(node: HastNode): HastNode | undefined {
	let replacement: HastNode | undefined
	treeFences().element.visit(node, {
		replaceNode(_node, next) {
			replacement = Array.isArray(next) ? next[0] : (next as HastNode)
		},
	})
	return replacement
}

const SOURCE = ["~/.traj/", "  traj.db  # the ledger — keep it", "  bin/  # safe to delete"].join(
	"\n",
)

describe("a tree fence's source", () => {
	test("nests by two spaces, marks a folder by its slash, and reads its note", () => {
		expect(parseTree(SOURCE)).toEqual([
			{
				name: "~/.traj",
				folder: true,
				children: [
					{ name: "traj.db", folder: false, note: "the ledger — keep it", children: [] },
					{ name: "bin", folder: true, note: "safe to delete", children: [] },
				],
			},
		])
	})

	test("keeps two roots apart and nests a grandchild under its folder", () => {
		const roots = parseTree(
			[
				"~/.traj/",
				"  bin/",
				"    traj  # the launcher",
				"~/.config/traj/",
				"  telemetry.json",
			].join("\n"),
		)

		expect(roots.map((root) => root.name)).toEqual(["~/.traj", "~/.config/traj"])
		expect(roots[0]?.children[0]?.children[0]?.name).toBe("traj")
		expect(roots[1]?.children[0]?.name).toBe("telemetry.json")
	})
})

describe("the tree fence plugin", () => {
	test("turns the fence into a named list with a glyph hidden from a screen reader", () => {
		const list = run(fence("tree", SOURCE))

		expect(list?.tagName).toBe("ul")
		expect(list?.properties).toEqual({ className: ["docs-tree"], ariaLabel: "File tree" })
		const adapter = (list?.children ?? [])[0]
		expect(adapter?.tagName).toBe("li")
		const row = (adapter?.children ?? [])[0]
		const glyph = (row?.children ?? [])[0]
		expect(glyph?.tagName).toBe("svg")
		expect(glyph?.properties?.["ariaHidden"]).toBe(true)
	})

	test("nests a folder's children in a list of their own", () => {
		const list = run(fence("tree", SOURCE))
		const adapter = (list?.children ?? [])[0]
		const nested = (adapter?.children ?? [])[1]

		expect(nested?.tagName).toBe("ul")
		expect(nested?.properties).toEqual({ className: ["docs-tree"] })
		expect((nested?.children ?? []).map((item) => item.tagName)).toEqual(["li", "li"])
	})

	test("leaves every other fence alone", () => {
		expect(run(fence("bash", "ls ~/.traj"))).toBeUndefined()
	})
})
