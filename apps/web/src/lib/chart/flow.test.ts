import { describe, expect, test } from "bun:test"
import { FLOW_MARGIN, type FlowInput, layoutFlow } from "./flow"

const band = (key: string, kind: FlowInput["sources"][number]["kind"], amount: string) => ({
	key,
	kind,
	label: key,
	amount,
})

describe("layoutFlow", () => {
	test("stacks a salary on the left against tax and spending on the right, at a scale of 3px per unit", () => {
		// The largest column is 100.00, so 300px fill the cash node: salary is 300px, tax 60px, spending 240px.
		const layout = layoutFlow({
			sources: [band("salary", "income", "100.00")],
			uses: [band("tax", "tax", "20.00"), band("spending", "spending", "80.00")],
		})
		expect(layout.width).toBe(800)
		expect(layout.height).toBe(316)
		expect(layout.cash).toEqual({ x: 400, y: 8, width: 12, height: 300 })
		const node = (key: string) => layout.nodes.find((entry) => entry.key === key)
		expect(node("salary")).toMatchObject({
			side: "source",
			x: 230,
			y: 8,
			height: 300,
			labelX: 222,
			labelY: 158,
			anchor: "end",
		})
		expect(node("tax")).toMatchObject({
			side: "use",
			x: 570,
			y: 8,
			height: 60,
			labelX: 590,
			labelY: 38,
			anchor: "start",
		})
		expect(node("spending")).toMatchObject({ side: "use", x: 570, y: 68, height: 240, labelY: 188 })
	})

	test("draws each link as a closed ribbon from its node to the cash node, in stacking order", () => {
		const layout = layoutFlow({
			sources: [band("salary", "income", "100.00")],
			uses: [band("tax", "tax", "20.00"), band("spending", "spending", "80.00")],
		})
		const link = (key: string) => layout.links.find((entry) => entry.key === key)?.d
		expect(link("salary")).toBe("M242,8 C321,8 321,8 400,8 L400,308 C321,308 321,308 242,308 Z")
		expect(link("tax")).toBe("M412,8 C491,8 491,8 570,8 L570,68 C491,68 491,68 412,68 Z")
		expect(link("spending")).toBe(
			"M412,68 C491,68 491,68 570,68 L570,308 C491,308 491,308 412,308 Z",
		)
	})

	test("a zero line draws nothing, and a Shortfall year draws its unmet money as a source", () => {
		// Left: 60.00 income and 40.00 unmet, 100.00 in all. Right: 90.00 spending and a zero saving.
		const layout = layoutFlow({
			sources: [band("income", "income", "60.00"), band("unmet", "unmet", "40.00")],
			uses: [band("spending", "spending", "90.00"), band("saving", "saving", "0.00")],
		})
		expect(layout.nodes.map((entry) => entry.key)).toEqual(["income", "unmet", "spending"])
		expect(layout.links.map((entry) => entry.key)).toEqual(["income", "unmet", "spending"])
		expect(layout.nodes.find((entry) => entry.key === "unmet")).toMatchObject({
			kind: "unmet",
			side: "source",
			y: 188,
			height: 120,
		})
		expect(layout.cash.height).toBe(300)
	})

	test("lifts a thin band to the minimum height and keeps its true amount, and pushes its label clear", () => {
		// The largest column is 300.00, so the scale is 1px per unit: a refund of 0.10 would be 0.1px.
		const layout = layoutFlow({
			sources: [band("income", "income", "299.90"), band("refund", "refund", "0.10")],
			uses: [band("spending", "spending", "300.00")],
		})
		const refund = layout.nodes.find((entry) => entry.key === "refund")
		expect(refund).toMatchObject({ y: 307.9, height: 3, amount: "0.10" })
		expect(layout.cash.height).toBe(302.9)
		expect(layout.height).toBe(302.9 + 2 * FLOW_MARGIN)
		const income = layout.nodes.find((entry) => entry.key === "income")
		expect(refund?.labelY).toBeGreaterThanOrEqual((income?.labelY ?? 0) + 14)
	})

	test("an empty year is an empty diagram with no NaN", () => {
		const layout = layoutFlow({ sources: [], uses: [] })
		expect(layout.nodes).toEqual([])
		expect(layout.links).toEqual([])
		expect(layout.cash.height).toBe(0)
		expect(layout.height).toBe(2 * FLOW_MARGIN)
		expect(JSON.stringify(layout)).not.toContain("NaN")
	})

	test("a year with one source only still balances its cash node", () => {
		const layout = layoutFlow({
			sources: [band("salary", "income", "50.00")],
			uses: [band("tax", "tax", "50.00")],
		})
		expect(layout.nodes.map((entry) => [entry.side, entry.height])).toEqual([
			["source", 300],
			["use", 300],
		])
		expect(layout.cash.height).toBe(300)
	})
})
