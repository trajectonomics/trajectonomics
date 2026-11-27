import { describe, expect, test } from "bun:test"
import type { HastNode } from "./hast"
import { linkCards } from "./link-cards"

const text = (value: string): HastNode => ({ type: "text", value })
const link = (href: string, name: string): HastNode => ({
	type: "element",
	tagName: "a",
	properties: { href },
	children: [text(name)],
})
const item = (...children: HastNode[]): HastNode => ({ type: "element", tagName: "li", children })
const list = (...children: HastNode[]): HastNode => ({ type: "element", tagName: "ul", children })

/** Run the plugin over one node, returning its replacement. */
function run(node: HastNode): HastNode | undefined {
	let replacement: HastNode | undefined
	linkCards().element.visit(node, {
		replaceNode(_node, next) {
			replacement = Array.isArray(next) ? next[0] : (next as HastNode)
		},
	})
	return replacement
}

function classesOf(node: HastNode): readonly unknown[] {
	const classes = node.properties?.["className"]
	return Array.isArray(classes) ? classes : []
}

describe("a list whose items start with a link and say more", () => {
	test("is marked as link cards and its items become rounded cards", () => {
		const marked = run(
			list(
				item(link("/cli/installation/", "Installation"), text(": the three channels")),
				item(link("/cli/data/", "Your data"), text(": the directory and backups")),
			),
		)

		expect(marked?.tagName).toBe("ul")
		expect(classesOf(marked as HastNode)).toEqual(["docs-link-cards"])
		expect((marked?.children ?? []).map((card) => classesOf(card).includes("rounded-md"))).toEqual([
			true,
			true,
		])
	})

	test("drops the colon and keeps the line as its own span", () => {
		const marked = run(list(item(link("/cli/data/", "Your data"), text(": the directory"))))
		const card = (marked?.children ?? [])[0]
		const line = (card?.children ?? [])[1]

		expect(line?.tagName).toBe("span")
		expect(classesOf(line as HastNode)).toContain("docs-link-card-line")
		expect((line?.children ?? []).map((child) => child.value)).toEqual(["the directory"])
	})

	test("keeps a class the list already carried", () => {
		const withClass: HastNode = {
			...list(item(link("/cli/", "CLI"), text(": the command line"))),
			properties: { className: ["existing"] },
		}

		expect(classesOf(run(withClass) as HastNode)).toEqual(["existing", "docs-link-cards"])
	})

	test("ignores the whitespace MDX leaves between the list and its items", () => {
		const spaced = list(
			text("\n"),
			item(link("/cli/", "CLI"), text(": the command line")),
			text("\n"),
		)

		expect(classesOf(run(spaced) as HastNode)).toEqual(["docs-link-cards"])
	})
})

describe("a list that is not a set of link cards", () => {
	test("a list with a plain item is left alone", () => {
		expect(run(list(item(text("no link"))))).toBeUndefined()
	})

	test("a list whose item is only a link is left alone", () => {
		expect(run(list(item(link("/cli/", "CLI"))))).toBeUndefined()
	})

	test("an ordered list is never a card grid", () => {
		const ordered: HastNode = {
			type: "element",
			tagName: "ol",
			children: [item(link("/cli/", "CLI"), text(": the command line"))],
		}

		expect(run(ordered)).toBeUndefined()
	})
})
