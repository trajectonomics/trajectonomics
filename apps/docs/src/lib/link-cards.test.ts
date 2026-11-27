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
const code = (value: string): HastNode => ({
	type: "element",
	tagName: "code",
	children: [text(value)],
})

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

/** The text of a hast subtree. */
function textOf(node: HastNode): string {
	if (node.type === "text") return node.value ?? ""
	return (node.children ?? []).map(textOf).join("")
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

	test("matches the Quickstart's What next shape", () => {
		const marked = run(
			list(
				item(
					link("/cli/installation/", "Installation"),
					text(": the three install channels, the agent skill, release\n  pinning and uninstall."),
				),
				item(link("/cli/data/", "Your data"), text(": the data directory and backups")),
			),
		)

		expect(classesOf(marked as HastNode)).toEqual(["docs-link-cards"])
	})

	test("keeps every space and every colon after the first one", () => {
		const marked = run(
			list(
				item(
					link("/cli/configuration/", "Alpha"),
					text(": flags "),
					code("--a"),
					text(" "),
					code("--b"),
					text(" set "),
					code("TRAJ_HOME"),
					text(": the directory."),
				),
			),
		)
		const line = (marked?.children ?? [])[0]?.children?.[1]

		expect(line?.tagName).toBe("span")
		expect(textOf(line as HastNode)).toBe("flags --a --b set TRAJ_HOME: the directory.")
		expect((line?.children ?? [])[0]?.value).toBe("flags ")
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

	test("an item that only starts with a sentence does not match", () => {
		const sentence = item(text("Read "), link("/x", "Alpha"), text(" before anything."))

		expect(run(list(sentence))).toBeUndefined()
	})

	test("an item carrying a second link does not match", () => {
		const second = item(
			link("/x", "Alpha"),
			text(": then read "),
			link("/y", "Beta"),
			text(" too."),
		)

		expect(run(list(second))).toBeUndefined()
	})

	test("an item whose line is only a nested list does not match", () => {
		const nested = item(link("/x", "Alpha"), text(": "), {
			type: "element",
			tagName: "ul",
			children: [item(text("Beta"))],
		})

		expect(run(list(nested))).toBeUndefined()
	})

	test("a block element after the colon does not match", () => {
		const paragraph = item(link("/x", "Alpha"), text(": "), {
			type: "element",
			tagName: "p",
			children: [text("the words")],
		})

		expect(run(list(paragraph))).toBeUndefined()
	})
})
