import { describe, expect, test } from "bun:test"
import { flowFences, parseFlow } from "./flow-fence"
import type { HastNode } from "./hast"

const TEXT = (value: string): HastNode => ({ type: "text", value })

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
				children: [TEXT(body)],
			},
		],
	}
}

/** Run the plugin over one node, returning its replacement. */
function run(node: HastNode): HastNode | undefined {
	let replacement: HastNode | undefined
	flowFences().element.visit(node, {
		replaceNode(_node, next) {
			replacement = Array.isArray(next) ? next[0] : (next as HastNode)
		},
	})
	return replacement
}

function textOf(node: HastNode): string {
	if (node.type === "text") return node.value ?? ""
	return (node.children ?? []).map(textOf).join("")
}

describe("a flow fence's source", () => {
	test("splits nodes on either arrow and keeps the detail after the first colon", () => {
		expect(parseFlow("Install -> Add accounts: traj account add → Net worth: 879.50 THB")).toEqual([
			{ label: "Install" },
			{ label: "Add accounts", detail: "traj account add" },
			{ label: "Net worth", detail: "879.50 THB" },
		])
	})

	test("keeps a colon inside the detail, and drops an empty detail", () => {
		expect(parseFlow("Ask: what: why -> Done: ")).toEqual([
			{ label: "Ask", detail: "what: why" },
			{ label: "Done" },
		])
	})
})

describe("the flow fence plugin", () => {
	test("turns the fence into a named list of nodes, the last one the result", () => {
		const list = run(fence("flow", "You: a question -> Agent: asks -> traj: 879.50 THB"))

		expect(list?.tagName).toBe("ol")
		expect(list?.properties).toEqual({ className: ["docs-flow"], ariaLabel: "Flow" })
		const items = list?.children ?? []
		expect(items.map((item) => item.tagName)).toEqual(["li", "li", "li"])
		const results = items.map((item) => {
			const classes = item.properties?.["className"]
			return Array.isArray(classes) && classes.includes("docs-flow-result")
		})
		expect(results).toEqual([false, false, true])
		expect(textOf(list as HastNode)).toContain("879.50 THB")
	})

	test("leads every node but the first with an aria-hidden arrow", () => {
		const list = run(fence("flow", "One -> Two -> Three"))
		const cards = (list?.children ?? []).map((item) => item.children ?? [])

		expect(cards.map((children) => children.map((child) => child.tagName))).toEqual([
			["div"],
			["span", "div"],
			["span", "div"],
		])
		const arrows = cards.flatMap((children) =>
			children.filter((child) => {
				const classes = child.properties?.["className"]
				return Array.isArray(classes) && classes.includes("docs-flow-arrow")
			}),
		)
		expect(arrows.map((arrow) => arrow.properties?.["ariaHidden"])).toEqual([true, true])
	})

	test("reads Astro's unrestored fence shape too", () => {
		const astro: HastNode = {
			type: "element",
			tagName: "pre",
			children: [
				{
					type: "element",
					tagName: "pre",
					properties: { className: ["language-flow"] },
					children: [TEXT("One -> Two")],
				},
			],
		}

		expect(run(astro)?.tagName).toBe("ol")
	})

	test("leaves every other fence alone", () => {
		expect(run(fence("bash", "traj balance"))).toBeUndefined()
	})
})

describe("a node without a detail", () => {
	test("shows its label as the node's own text, not as an eyebrow", () => {
		const list = run(fence("flow", "traj init -> Done"))
		const classesOf = (item: HastNode | undefined) =>
			(item?.children ?? [])
				.filter((child) => child.tagName === "div")
				.flatMap((card) => card.children ?? [])
				.map((child) => child.properties?.["className"])

		expect(classesOf(list?.children?.[0])).toEqual([["docs-flow-detail"]])
		expect(classesOf(list?.children?.[1])).toEqual([
			["docs-flow-detail", "text-xl", "font-semibold"],
		])
	})
})
