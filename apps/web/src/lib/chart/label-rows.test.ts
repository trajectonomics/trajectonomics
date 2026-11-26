import { describe, expect, test } from "bun:test"
import { type LabelledMark, placedLabels } from "./label-rows"
import { bareArea, chartArea, faults, threeRules } from "./label-rows.test-support"

// Each narrow letter is 7.5px in the chart's text (7px in monospace), the sans-serif ellipsis is 12px and
// the monospace one 7px, a label stands 4px off its rule and two labels keep 6px between them.
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
		// "ab" spans 104 to 119, so a label starting at 125 (x 121) fits beside it; one at 124 (x 120) does not.
		const rows = (x: number) =>
			placedLabels(
				[
					{ x: 100, label: "ab" },
					{ x, label: "c" },
				],
				bareArea(600),
			).map((label) => label.row)
		expect(rows(121)).toEqual([0, 0])
		expect(rows(120)).toEqual([0, 1])
	})

	test("a third marker goes back to the first row that is free", () => {
		const marks = [
			{ x: 50, label: "car" },
			{ x: 50, label: "home" },
			{ x: 200, label: "kid" },
		]
		expect(placedLabels(marks, bareArea(600)).map((label) => label.row)).toEqual([0, 1, 0])
	})

	test("moves a label whole to the other side rather than shortening it", () => {
		// Width 410: x 324 prefers the left, where the rule at 300 leaves 20px, but the right has 82px and
		// holds the whole 75px label, so it goes there whole and both labels share the top row.
		const placed = placedLabels(marksAt([300, 324]), bareArea(410))
		expect(placed.map((label) => label.text)).toEqual(["abcdefghij", "abcdefghij"])
		expect(placed.map((label) => label.leftwards)).toEqual([true, false])
		expect(placed.map((label) => label.row)).toEqual([0, 0])
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

	test("draws a label whole on the other side before shortening it on its own", () => {
		// #633 at 1280px on Milestones: the rule 35px to the right leaves 31px, while 215px to the left hold
		// the whole 60px Thai label, so it hangs left whole instead of drawing "เก…" on the right.
		const marks = [
			{ x: 250, label: "เกษียณอายุ" },
			{ x: 285, label: "b" },
		]
		const placed = placedLabels(marks, { width: 600, left: 31, right: 600 })
		expect(placed[0]).toMatchObject({ leftwards: true, text: "เกษียณอายุ" })
	})

	test("shortens on the roomier side when neither side holds the whole label", () => {
		// The rule at 180 leaves 26px to the right, enough for "a…" on the preferred side; the plot's edge at
		// 90 leaves 56px to the left, less than the whole 75px label but enough for "abcde…", so the label
		// shortens on its roomier left side rather than on its preferred one.
		const marks = [
			{ x: 150, label: "abcdefghij" },
			{ x: 180, label: "k" },
		]
		const area = { width: 600, left: 90, right: 600 }
		const placed = placedLabels(marks, area)
		expect(placed[0]).toEqual({ row: 0, leftwards: true, text: "abcde…" })
		expect(faults(marks, placed, area)).toEqual([])
	})

	test("keeps the preferred side when both sides have the same room", () => {
		// Rules 40px either side of a marker left of the middle: neither side holds the whole label, both hold
		// the same shortened words, and the tie goes to the preferred right side.
		const marks = [
			{ x: 160, label: "k" },
			{ x: 200, label: "abcdefghij" },
			{ x: 240, label: "k" },
		]
		const area = bareArea(600)
		const placed = placedLabels(marks, area)
		expect(placed[1]).toMatchObject({ leftwards: false })
		expect(placed[1]?.text.endsWith("…")).toBe(true)
		expect(faults(marks, placed, area)).toEqual([])
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
		// 6px on each side of the rule at 150's neighbours: not even one 7.5px letter.
		const none = marksAt([140, 150, 160])
		expect(placedLabels(none, bareArea(600))[1]?.text).toBe("")
		// 8px to the right of the middle rule, 6px to its left.
		const one = marksAt([140, 150, 162])
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
