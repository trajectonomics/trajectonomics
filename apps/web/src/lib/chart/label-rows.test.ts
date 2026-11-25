import { describe, expect, test } from "bun:test"
import { type LabelledMark, placedLabels } from "./label-rows"
import { bareArea, chartArea, faults, threeRules } from "./label-rows.test-support"

// Each narrow letter is 7px, the sans-serif ellipsis is 12px and the monospace one 7px, a label stands 4px
// off its rule and two labels keep 6px between them.
const marksAt = (xs: readonly number[], label = "abcdefghij"): LabelledMark[] =>
	xs.map((x) => ({ x, label }))

describe("placedLabels: rows", () => {
	test("two markers on the same date take two rows", () => {
		const marks = [
			{ x: 100, label: "a" },
			{ x: 100, label: "b" },
		]
		const placed = placedLabels(marks, bareArea(600))
		expect(placed.map((label) => label.row)).toEqual([0, 1])
		expect(placed.map((label) => label.text)).toEqual(["a", "b"])
	})

	test("markers far apart share the top row", () => {
		// "ab" spans 104 to 118, so a label starting at 124 (x 120) fits beside it; one at 123 (x 119) does not.
		const rows = (x: number) =>
			placedLabels(
				[
					{ x: 100, label: "ab" },
					{ x, label: "c" },
				],
				bareArea(600),
			).map((label) => label.row)
		expect(rows(120)).toEqual([0, 0])
		expect(rows(119)).toEqual([0, 1])
	})

	test("a third marker goes back to the first row that is free", () => {
		const marks = [
			{ x: 50, label: "car" },
			{ x: 50, label: "home" },
			{ x: 200, label: "kid" },
		]
		expect(placedLabels(marks, bareArea(600)).map((label) => label.row)).toEqual([0, 1, 0])
	})

	test("labels past the middle hang left of their rule and still never overlap", () => {
		// Width 400: x 300 and 324 both hang left. The label at 324 stops at the rule at 300, and its "a…"
		// still spans 301 to 320, only 5px after the label at 300 (226 to 296), so it takes the next row.
		const placed = placedLabels(marksAt([300, 324]), bareArea(400))
		expect(placed.map((label) => label.row)).toEqual([0, 1])
		expect(placed.map((label) => label.leftwards)).toEqual([true, true])
	})

	test("rows follow each marker's own index, whatever order the markers come in", () => {
		const marks = [
			{ x: 300, label: "z" },
			{ x: 10, label: "a" },
			{ x: 10, label: "b" },
		]
		expect(placedLabels(marks, bareArea(600)).map((label) => label.row)).toEqual([0, 0, 1])
	})

	test("a label that is not drawn takes no row", () => {
		const marks = [
			{ x: 100, label: "" },
			{ x: 110, label: "b" },
		]
		const placed = placedLabels(marks, bareArea(600))
		expect(placed.map((label) => label.text)).toEqual(["", "b"])
		expect(placed.map((label) => label.row)).toEqual([0, 0])
	})
})

describe("placedLabels: rules and the plot's edges", () => {
	test("says the side of a label moved to the other side of its rule", () => {
		// The rule at 110 leaves 6px to the right, too little for an ellipsis; the label hangs left instead.
		const marks = [
			{ x: 100, label: "abcdefghij" },
			{ x: 110, label: "k" },
		]
		const placed = placedLabels(marks, bareArea(600))
		expect(placed.map((label) => label.text)).toEqual(["abcdefghij", "k"])
		expect(placed.map((label) => label.leftwards)).toEqual([true, false])
		expect(faults(marks, placed, bareArea(600))).toEqual([])
	})

	test("stops a moved label at the plot's left edge", () => {
		// The Demo's second Milestone 18 months after its first, on Plans at 360px: the first label moves left
		// of its rule, where only the 21px to the plot's edge are free.
		const marks = [
			{ x: 89, label: "car-paid-off", code: true },
			{ x: 101, label: "net-worth-ten-million", code: true },
		]
		const placed = placedLabels(marks, chartArea(294))
		expect(placed[0]).toEqual({ row: 0, leftwards: true, text: "ca…" })
		expect(faults(marks, placed, chartArea(294))).toEqual([])
	})

	test.each([
		["near the right edge", [262, 272], ["abcdefghij", ""]],
		["near the left edge", [70, 80], ["", "abcdefghij"]],
	])("draws nothing off the chart for two rules %s", (_name, xs, texts) => {
		const marks = marksAt(xs)
		const placed = placedLabels(marks, chartArea(294))
		expect(placed.map((label) => label.text)).toEqual(texts)
		expect(faults(marks, placed, chartArea(294))).toEqual([])
	})

	test("a lone rule on the plot's edge keeps its label inside", () => {
		for (const x of [64, 278]) {
			const marks = marksAt([x])
			const placed = placedLabels(marks, chartArea(294))
			expect(placed[0]?.text).toBe("abcdefghij")
			expect(placed[0]?.leftwards).toBe(x === 278)
		}
	})

	test("draws the bare first letter where only that fits, and nothing where it does not", () => {
		// 6px on each side of the rule at 150's neighbours: not even one 7px letter.
		const none = marksAt([140, 150, 160])
		expect(placedLabels(none, bareArea(600))[1]?.text).toBe("")
		// 7px to the right of the middle rule, 6px to its left.
		const one = marksAt([140, 150, 161])
		const placed = placedLabels(one, bareArea(600))
		expect(placed[1]).toMatchObject({ leftwards: false, text: "a" })
		expect(faults(one, placed, bareArea(600))).toEqual([])
		// Rules 5px apart leave the middle one nothing on either side.
		expect(placedLabels(marksAt([150, 155, 160]), bareArea(600))[1]?.text).toBe("")
	})

	test("no label leaves the plot, covers a rule or overlaps another, wherever the rules stand", () => {
		const found = [240, 294, 640].flatMap((width) => {
			const area = chartArea(width)
			return threeRules(area).flatMap((marks) => faults(marks, placedLabels(marks, area), area))
		})
		expect(found).toEqual([])
	})
})
