import { describe, expect, test } from "bun:test"
import { FLOW_MARGIN, type FlowInput, LABEL_HALF, layoutFlow } from "./flow"

const band = (key: string, kind: FlowInput["sources"][number]["kind"], amount: string) => ({
	key,
	kind,
	label: key,
	amount,
})

/** Every label's box lies inside the diagram: below its top edge and above its bottom one. */
function expectLabelsInside(layout: ReturnType<typeof layoutFlow>): void {
	for (const node of layout.nodes) {
		expect(node.labelY - LABEL_HALF).toBeGreaterThanOrEqual(0)
		expect(node.labelY + LABEL_HALF).toBeLessThanOrEqual(layout.height)
	}
}

describe("layoutFlow", () => {
	test("stacks a salary on the left against tax and spending on the right, at a scale of 3px per unit", () => {
		// The largest column is 100.00, so 300px fill a column: salary is 300px, tax 60px, spending 240px.
		// The right column has one 4px gap, so it is 304px and the cash node is 304px.
		// The salary is centred on the node: (304 - 300) / 2 = 2px down, so it starts at 10.
		const layout = layoutFlow({
			sources: [band("salary", "income", "100.00")],
			uses: [band("tax", "tax", "20.00"), band("spending", "spending", "80.00")],
		})
		expect(layout.width).toBe(800)
		expect(layout.cash).toEqual({ x: 400, y: 8, width: 12, height: 304 })
		const node = (key: string) => layout.nodes.find((entry) => entry.key === key)
		// The label is centred on its band: 10 + 300 / 2 = 160. The spending band starts at 8 + 60 + 4 = 72.
		expect(node("salary")).toMatchObject({
			side: "source",
			x: 230,
			y: 10,
			height: 300,
			labelX: 222,
			labelY: 160,
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
		expect(node("spending")).toMatchObject({ side: "use", x: 570, y: 72, height: 240, labelY: 192 })
		// The lowest label ends at 192 + 8 = 200, which is inside the cash node's bottom at 8 + 304 = 312.
		// So the height is 312 + 8 = 320.
		expect(layout.height).toBe(320)
		expectLabelsInside(layout)
	})

	test("draws each link as a closed ribbon, bent where a column is centred on the node", () => {
		const layout = layoutFlow({
			sources: [band("salary", "income", "100.00")],
			uses: [band("tax", "tax", "20.00"), band("spending", "spending", "80.00")],
		})
		const link = (key: string) => layout.links.find((entry) => entry.key === key)?.d
		// Salary runs from its node at 10 to the cash node at 8: the 2px centring offset is a small bend.
		expect(link("salary")).toBe("M242,10 C321,10 321,8 400,8 L400,308 C321,308 321,310 242,310 Z")
		// Tax and spending sit at the cash node's own tops, so their ribbons are straight across.
		expect(link("tax")).toBe("M412,8 C491,8 491,8 570,8 L570,68 C491,68 491,68 412,68 Z")
		expect(link("spending")).toBe(
			"M412,72 C491,72 491,72 570,72 L570,312 C491,312 491,312 412,312 Z",
		)
	})

	test("a zero line draws nothing, and a Shortfall year draws its unmet money as a source", () => {
		// Left: 60.00 income and 40.00 unmet, 100.00 in all. Right: 90.00 spending and a zero saving.
		// The scale is 3px per unit: income 180px, unmet 120px, with one 4px gap, so the left column is 304px.
		// Spending is 270px, centred: (304 - 270) / 2 = 17px down, so it starts at 25.
		const layout = layoutFlow({
			sources: [band("income", "income", "60.00"), band("unmet", "unmet", "40.00")],
			uses: [band("spending", "spending", "90.00"), band("saving", "saving", "0.00")],
		})
		expect(layout.nodes.map((entry) => entry.key)).toEqual(["income", "unmet", "spending"])
		expect(layout.links.map((entry) => entry.key)).toEqual(["income", "unmet", "spending"])
		expect(layout.nodes.find((entry) => entry.key === "unmet")).toMatchObject({
			kind: "unmet",
			side: "source",
			y: 192,
			height: 120,
		})
		expect(layout.nodes.find((entry) => entry.key === "spending")).toMatchObject({ y: 25 })
		expect(layout.cash.height).toBe(304)
		expect(layout.links.find((entry) => entry.key === "income")?.d).toBe(
			"M242,8 C321,8 321,8 400,8 L400,188 C321,188 321,188 242,188 Z",
		)
		expect(layout.links.find((entry) => entry.key === "spending")?.d).toBe(
			"M412,8 C491,8 491,25 570,25 L570,295 C491,295 491,278 412,278 Z",
		)
		expectLabelsInside(layout)
	})

	test("lifts a thin band to the minimum height and keeps its true amount, and pushes its label clear", () => {
		// The largest column is 300.00, so the scale is 1px per unit: a refund of 0.10 would be 0.1px.
		// The left column is income 299.9px and the refund 3px, with a 4px gap: 8 + 299.9 + 4 = 311.9 starts
		// the refund, and the column is 306.9px. The right spending band is 300px, centred: (306.9 - 300) / 2
		// = 3.45px down.
		const layout = layoutFlow({
			sources: [band("income", "income", "299.90"), band("refund", "refund", "0.10")],
			uses: [band("spending", "spending", "300.00")],
		})
		const refund = layout.nodes.find((entry) => entry.key === "refund")
		const income = layout.nodes.find((entry) => entry.key === "income")
		// The refund's label is centred on its 3px band: 311.9 + 1.5 = 313.4. The income label is 8 + 149.95 =
		// 157.95, so the refund label is not pushed.
		expect(refund).toMatchObject({ y: 311.9, height: 3, amount: "0.10", labelY: 313.4 })
		expect(income?.labelY).toBe(157.95)
		expect(layout.cash.height).toBe(306.9)
		// The refund label ends at 313.4 + 8 = 321.4, below the cash node's bottom at 8 + 306.9 = 314.9.
		// So the height is 321.4 + 8 = 329.4.
		expect(layout.height).toBe(329.4)
		expectLabelsInside(layout)
	})

	test("many thin bands in one column keep a gap between them and push their labels down inside the box", () => {
		// Sources: salary 299.00, then five 0.20 bands. Uses: spending 300.00. The scale is 1px per unit.
		// The salary is 299px, so the thin bands start at 8 + 299 + 4 = 311 and each is 3px with a 4px gap:
		// tops 311, 318, 325, 332, 339. The left column is 334px (8 to 342 plus the gaps, from 8 to 342 is 334px).
		// Spending is 300px, centred: (334 - 300) / 2 = 17px down, so it starts at 25.
		const layout = layoutFlow({
			sources: [
				band("salary", "income", "299.00"),
				band("t1", "refund", "0.20"),
				band("t2", "refund", "0.20"),
				band("t3", "refund", "0.20"),
				band("t4", "refund", "0.20"),
				band("t5", "refund", "0.20"),
			],
			uses: [band("spending", "spending", "300.00")],
		})
		const tops = layout.nodes.map((entry) => [entry.key, entry.y, entry.height])
		expect(tops).toEqual([
			["salary", 8, 299],
			["t1", 311, 3],
			["t2", 318, 3],
			["t3", 325, 3],
			["t4", 332, 3],
			["t5", 339, 3],
			["spending", 25, 300],
		])
		// The label centres are 157.5, then 312.5, 319.5, 326.5, 333.5, 340.5. Pushing each one down
		// to 14px below the one above gives 312.5, 326.5, 340.5, 354.5, 368.5.
		const labels = layout.nodes.map((entry) => entry.labelY)
		expect(labels).toEqual([157.5, 312.5, 326.5, 340.5, 354.5, 368.5, 175])
		// The lowest label ends at 368.5 + 8 = 376.5, which is below the cash node's bottom at 8 + 334 = 342.
		// So the height is 376.5 + 8 = 384.5.
		expect(layout.cash.height).toBe(334)
		expect(layout.height).toBe(384.5)
		expectLabelsInside(layout)
		for (let index = 2; index < labels.length - 1; index++) {
			expect((labels[index] ?? 0) - (labels[index - 1] ?? 0)).toBeGreaterThanOrEqual(14)
		}
	})

	test("the bands of a column are separated by the gap, both at the node and at the cash node", () => {
		const layout = layoutFlow({
			sources: [band("a", "income", "50.00"), band("b", "income", "50.00")],
			uses: [band("spending", "spending", "100.00")],
		})
		// Scale 3px per unit: each source is 150px, and the gap is 4px, so the column is 304px.
		// The second source starts at 8 + 150 + 4 = 162, and its ribbon leaves the cash node at 162 too.
		const second = layout.nodes.find((entry) => entry.key === "b")
		expect(second).toMatchObject({ y: 162, height: 150 })
		expect(layout.links.find((entry) => entry.key === "b")?.d).toBe(
			"M242,162 C321,162 321,162 400,162 L400,312 C321,312 321,312 242,312 Z",
		)
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
		// Both labels are centred at 158, so their boxes end at 166. The cash node's bottom at 8 + 300 = 308
		// is lower, so the height is 308 + 8 = 316.
		expect(layout.height).toBe(316)
	})
})
