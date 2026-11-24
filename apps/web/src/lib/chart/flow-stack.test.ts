import { describe, expect, test } from "bun:test"
import {
	layoutStack,
	STACK_CHAR_WIDTH,
	STACK_LABEL_HALF,
	STACK_MARGIN,
	STACK_WIDTH,
	type StackLayout,
	stackName,
} from "./flow-stack"
import type { FlowInput } from "./flow-types"

const band = (key: string, kind: FlowInput["sources"][number]["kind"], amount: string) => ({
	key,
	kind,
	label: key,
	amount,
})

/** Every text line sits inside the layout, and every bar lies between its margins. */
function expectInside(layout: StackLayout): void {
	for (const heading of layout.headings) {
		expect(heading.y - STACK_LABEL_HALF).toBeGreaterThanOrEqual(0)
		expect(heading.y + STACK_LABEL_HALF).toBeLessThanOrEqual(layout.height)
	}
	for (const row of layout.rows) {
		expect(row.labelY - STACK_LABEL_HALF).toBeGreaterThanOrEqual(0)
		expect(row.labelY + STACK_LABEL_HALF).toBeLessThanOrEqual(row.barY)
		expect(row.barY + row.barHeight).toBeLessThanOrEqual(layout.height - STACK_MARGIN)
		expect(row.barX).toBeGreaterThanOrEqual(STACK_MARGIN)
		expect(row.barX + row.barWidth).toBeLessThanOrEqual(STACK_WIDTH - STACK_MARGIN)
	}
}

describe("layoutStack", () => {
	test("stacks the sources above the uses, each bar its share of the taller column", () => {
		// The largest column is 100.00, so 304 units fill it: 3.04 per unit. Salary is 304, tax 60.8, spending 243.2.
		// Margin 8: the sources' heading line is centred at 8 + 8 = 16, and the first row starts at 8 + 22 = 30.
		// A row is a 16-unit text line, a 2 gap and a 10-unit bar: its text is centred at 30 + 8 = 38, its bar at 48.
		// The next row would start at 30 + 28 + 10 = 68. The uses start 4 below that, at 72, and so on.
		const layout = layoutStack({
			sources: [band("salary", "income", "100.00")],
			uses: [band("tax", "tax", "20.00"), band("spending", "spending", "80.00")],
		})
		expect(layout.width).toBe(320)
		expect(layout.headings).toEqual([
			{ side: "source", text: "Money in", x: 8, y: 16 },
			{ side: "use", text: "Where it goes", x: 8, y: 80 },
		])
		const row = (key: string) => layout.rows.find((entry) => entry.key === key)
		expect(row("salary")).toMatchObject({
			side: "source",
			labelX: 8,
			amountX: 312,
			labelY: 38,
			barX: 8,
			barY: 48,
			barWidth: 304,
			barHeight: 10,
		})
		// The uses' heading ends at 72 + 22 = 94: tax is centred at 102 with its bar at 112, then spending
		// at 94 + 38 = 132: centred at 140 with its bar at 150.
		expect(row("tax")).toMatchObject({ side: "use", labelY: 102, barY: 112, barWidth: 60.8 })
		expect(row("spending")).toMatchObject({ labelY: 140, barY: 150, barWidth: 243.2 })
		// The last bar ends at 160, so the layout is 160 + 8 = 168 tall.
		expect(layout.height).toBe(168)
		expectInside(layout)
	})

	test("the bars of both lists share one scale, whichever list is the taller", () => {
		// The uses are 400.00 in all and the sources 100.00: 304 / 400 = 0.76 per unit, so 100.00 is 76 and a
		// 300.00 bar is 228. The sources are no longer than their share of the taller column.
		const layout = layoutStack({
			sources: [band("salary", "income", "100.00")],
			uses: [band("spending", "spending", "300.00"), band("saving", "saving", "100.00")],
		})
		expect(layout.rows.map((entry) => [entry.key, entry.barWidth])).toEqual([
			["salary", 76],
			["spending", 228],
			["saving", 76],
		])
	})

	test("an employer's money is in both lists, a payout is a source, and every band of the wide diagram has a row", () => {
		const layout = layoutStack({
			sources: [
				band("salary", "income", "60.00"),
				band("payout", "payout", "10.00"),
				band("employer", "employer", "30.00"),
				band("withdrawal", "withdrawal", "5.00"),
				band("drawn", "drawn", "5.00"),
				band("refund", "refund", "10.00"),
				band("unmet", "unmet", "10.00"),
			],
			uses: [
				band("tax", "tax", "20.00"),
				band("spending", "spending", "50.00"),
				band("saving", "saving", "20.00"),
				band("employer-into", "employer", "30.00"),
				band("left", "left-over", "10.00"),
			],
		})
		expect(layout.rows.map((entry) => [entry.side, entry.key, entry.kind])).toEqual([
			["source", "salary", "income"],
			["source", "payout", "payout"],
			["source", "employer", "employer"],
			["source", "withdrawal", "withdrawal"],
			["source", "drawn", "drawn"],
			["source", "refund", "refund"],
			["source", "unmet", "unmet"],
			["use", "tax", "tax"],
			["use", "spending", "spending"],
			["use", "saving", "saving"],
			["use", "employer-into", "employer"],
			["use", "left", "left-over"],
		])
		// The sources are 130.00 and the uses 130.00: 304 / 130 per unit, so 30.00 is 70.15 (rounded to 2 decimals).
		expect(layout.rows.find((entry) => entry.key === "employer")?.barWidth).toBe(70.15)
		expect(layout.rows.find((entry) => entry.key === "employer-into")?.barWidth).toBe(70.15)
		expectInside(layout)
	})

	test("a zero line draws nothing, and a list with no band has no heading", () => {
		const layout = layoutStack({
			sources: [band("salary", "income", "50.00")],
			uses: [band("saving", "saving", "0.00")],
		})
		expect(layout.rows.map((entry) => entry.key)).toEqual(["salary"])
		expect(layout.headings.map((entry) => entry.side)).toEqual(["source"])
		// One heading and one row: 8 + 22 + 28 = 58 for the bottom of the bar, and 66 with the margin.
		expect(layout.height).toBe(66)
	})

	test("a thin band is lifted to the least length and keeps its true amount", () => {
		// 304 / 1000 = 0.304 per unit: 0.10 would be 0.03 long, so it is lifted to 3.
		const layout = layoutStack({
			sources: [band("salary", "income", "999.90"), band("refund", "refund", "0.10")],
			uses: [band("spending", "spending", "1000.00")],
		})
		expect(layout.rows.find((entry) => entry.key === "refund")).toMatchObject({
			amount: "0.10",
			barWidth: 3,
		})
		expect(layout.rows.find((entry) => entry.key === "salary")?.barWidth).toBe(303.97)
	})

	test("a Shortfall year draws its unmet money as a source", () => {
		// Sources 60.00 + 40.00, uses 90.00: 3.04 per unit, so the unmet bar is 121.6 and spending 273.6.
		const layout = layoutStack({
			sources: [band("income", "income", "60.00"), band("unmet", "unmet", "40.00")],
			uses: [band("spending", "spending", "90.00")],
		})
		expect(layout.rows.find((entry) => entry.key === "unmet")).toMatchObject({
			kind: "unmet",
			side: "source",
			barWidth: 121.6,
		})
		expect(layout.rows.find((entry) => entry.key === "spending")?.barWidth).toBe(273.6)
	})

	test("an empty year is an empty layout with no NaN", () => {
		const layout = layoutStack({ sources: [], uses: [] })
		expect(layout.rows).toEqual([])
		expect(layout.headings).toEqual([])
		expect(layout.height).toBe(STACK_MARGIN)
		expect(JSON.stringify(layout)).not.toContain("NaN")
	})

	test("many bands keep a gap between rows, so no text line meets the one above", () => {
		const layout = layoutStack({
			sources: [
				band("a", "income", "10.00"),
				band("b", "income", "10.00"),
				band("c", "income", "10.00"),
			],
			uses: [band("d", "spending", "30.00")],
		})
		// Rows are 38 apart: 28 for the row and 10 for the gap. The sources end at 144, and the uses start 4 below,
		// with a 22-unit heading: 170 + 8 = 178.
		expect(layout.rows.map((entry) => entry.labelY)).toEqual([38, 76, 114, 178])
		expectInside(layout)
	})
})

describe("stackName", () => {
	test("keeps a name that fits, whole", () => {
		expect(stackName("salary", "100,000.00")).toBe("salary")
	})

	test("shortens a long name so the name and the amount fit the line, and never the amount", () => {
		// The line is 304 wide. The amount of 10 characters takes 75 and a gap of 8 more, which leaves 221:
		// 29 characters at 7.5: 28 of the name and an ellipsis, which is 217.5 + 8 + 75 = 300.5.
		const label = "Paid out by the long named retirement account"
		const name = stackName(label, "100,000.00")
		expect(name).toBe("Paid out by the long named r…")
		expect(name.length).toBe(29)
		expect(name.length * STACK_CHAR_WIDTH + 8 + 10 * STACK_CHAR_WIDTH).toBeLessThanOrEqual(304)
	})

	test("leaves only an ellipsis when the amount takes the line", () => {
		expect(stackName("salary", "9".repeat(40))).toBe("…")
	})
})
