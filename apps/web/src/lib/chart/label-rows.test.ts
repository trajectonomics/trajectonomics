import { describe, expect, test } from "bun:test"
import { placedLabels } from "./label-rows"

// Each character is 7px, the sans-serif ellipsis is 12px and the monospace one 7px, a label stands 4px off
// its rule and two labels keep 6px between them.
describe("placedLabels", () => {
	test("two markers on the same date take two rows", () => {
		const placed = placedLabels(
			[
				{ x: 100, label: "a" },
				{ x: 100, label: "b" },
			],
			600,
		)
		expect(placed.map((label) => label.row)).toEqual([0, 1])
		expect(placed.map((label) => label.text)).toEqual(["a", "b"])
	})

	test("markers far apart share the top row", () => {
		// "ab" spans 104 to 118, so a label starting at 124 (x 120) fits beside it; one at 123 (x 119) does not.
		expect(
			placedLabels(
				[
					{ x: 100, label: "ab" },
					{ x: 120, label: "c" },
				],
				600,
			).map((label) => label.row),
		).toEqual([0, 0])
		expect(
			placedLabels(
				[
					{ x: 100, label: "ab" },
					{ x: 119, label: "c" },
				],
				600,
			).map((label) => label.row),
		).toEqual([0, 1])
	})

	test("a third marker goes back to the first row that is free", () => {
		const marks = [
			{ x: 50, label: "car" },
			{ x: 50, label: "home" },
			{ x: 200, label: "kid" },
		]
		expect(placedLabels(marks, 600).map((label) => label.row)).toEqual([0, 1, 0])
	})

	test("labels past the middle hang left of their rule and still never overlap", () => {
		// Width 400: x 300 and 324 both hang left. "abcdefghij" at 324 stops at the rule at 300, and its "a…"
		// still spans 301 to 320, only 5px after the label at 300 (226 to 296), so it takes the next row.
		const placed = placedLabels(
			[
				{ x: 300, label: "abcdefghij" },
				{ x: 324, label: "abcdefghij" },
			],
			400,
		)
		expect(placed.map((label) => label.row)).toEqual([0, 1])
	})

	test("rows follow each marker's own index, whatever order the markers come in", () => {
		expect(
			placedLabels(
				[
					{ x: 300, label: "z" },
					{ x: 10, label: "a" },
					{ x: 10, label: "b" },
				],
				600,
			).map((label) => label.row),
		).toEqual([0, 0, 1])
	})

	test("a label stops short of the nearest rule on the side it runs towards", () => {
		// 46px before the rule at 150: four characters (28px) and the 12px ellipsis, the last mark of the text.
		const rightward = placedLabels(
			[
				{ x: 100, label: "abcdefghij" },
				{ x: 150, label: "k" },
			],
			600,
		)
		expect(rightward[0]?.text).toBe("abcd…")
		expect(100 + 4 + 4 * 7 + 12).toBeLessThan(150)

		// The same on the left: a label hanging left towards a rule 106px away keeps its whole text.
		const leftward = placedLabels(
			[
				{ x: 450, label: "abcdefghij" },
				{ x: 560, label: "abcdefghij" },
			],
			600,
		)
		expect(leftward[1]?.text).toBe("abcdefghij")
		// 26px between the rules at 450 and 480: two characters and the 12px ellipsis.
		const tight = placedLabels(
			[
				{ x: 450, label: "abcdefghij" },
				{ x: 480, label: "abcdefghij" },
			],
			600,
		)
		expect(tight[1]?.text).toBe("ab…")
	})

	test("reserves the sans-serif ellipsis width, and the narrower monospace one for a code label", () => {
		// 46px before the rule at 150: five characters and the 12px sans-serif ellipsis (47px) do not fit.
		expect(
			placedLabels(
				[
					{ x: 100, label: "abcdefghij" },
					{ x: 150, label: "k" },
				],
				600,
			)[0]?.text,
		).toBe("abcd…")
		// The same room in monospace: five characters and the 7px ellipsis (42px) fit.
		expect(
			placedLabels(
				[
					{ x: 100, label: "abcdefghij", code: true },
					{ x: 150, label: "k" },
				],
				600,
			)[0]?.text,
		).toBe("abcde…")
	})

	test("places the label on the other side of its rule when its own side leaves no room", () => {
		// The rule at 110 leaves 6px to the right, too little for an ellipsis; the label hangs left instead.
		const placed = placedLabels(
			[
				{ x: 100, label: "abcdefghij" },
				{ x: 110, label: "k" },
			],
			600,
		)
		expect(placed.map((label) => label.text)).toEqual(["abcdefghij", "k"])
		expect(placed.map((label) => label.row)).toEqual([0, 0])
	})

	test("keeps a visible stub when rules crowd the label on both sides", () => {
		// 6px to the right of the rule at 110 and 2px to its left: neither side fits an ellipsis, so the label
		// keeps its first grapheme rather than disappearing.
		const placed = placedLabels(
			[
				{ x: 100, label: "abcdefghij" },
				{ x: 110, label: "abcdefghij" },
				{ x: 120, label: "abcdefghij" },
			],
			600,
		)
		expect(placed[1]?.text).toBe("a")
		expect(placed[1]?.text).not.toBe("")
	})

	test("an empty label draws nothing and takes no row", () => {
		const placed = placedLabels(
			[
				{ x: 100, label: "" },
				{ x: 110, label: "b" },
			],
			600,
		)
		expect(placed.map((label) => label.text)).toEqual(["", "b"])
		expect(placed.map((label) => label.row)).toEqual([0, 0])
	})

	test("cuts Thai text between clusters, never inside one", () => {
		// "ซื้อบ้านหลังแรก" is clusters ซื้อ, บ้, า, น, ...; 26px fits the first two and the ellipsis.
		const placed = placedLabels(
			[
				{ x: 100, label: "ซื้อบ้านหลังแรก" },
				{ x: 130, label: "k" },
			],
			600,
		)
		expect(placed[0]?.text).toBe("ซื้อ…")
		const clusters = Array.from(
			new Intl.Segmenter("th", { granularity: "grapheme" }).segment("ซื้อบ้านหลังแรก"),
			(part) => part.segment,
		)
		expect(clusters.slice(0, 2).join("")).toBe("ซื้อ")
	})

	test("keeps a Thai tone mark with its base when the label is shortened", () => {
		// 19px fits one cluster and the ellipsis: "ผ่", the base with its tone mark, not "ผ" alone.
		const placed = placedLabels(
			[
				{ x: 100, label: "ผ่อนรถหมดแล้ว" },
				{ x: 123, label: "k" },
			],
			600,
		)
		expect(placed[0]?.text).toBe("ผ่…")
		expect(Array.from(placed[0]?.text.replace("…", "") ?? "")).toHaveLength(2)
	})

	test("never leaves a lone surrogate of an emoji", () => {
		// 73px fits the eight ASCII characters and the ellipsis, but not the emoji's 14px: the whole emoji goes.
		const placed = placedLabels(
			[
				{ x: 100, label: "pay-off-🏠-loan" },
				{ x: 177, label: "k" },
			],
			600,
		)
		const text = placed[0]?.text ?? ""
		expect(text).toBe("pay-off-…")
		expect(text).not.toMatch(
			/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/,
		)
	})

	test("a label that a neighbour's rule crossed, as Plans draws it on a 360px screen", () => {
		// Plans' card at 360px holds a 294px chart, and the Demo's base plan reaches its two Milestones at
		// these x. `car-paid-off` ran from 93 to 177 through the rule at 154, and `net-worth-ten-million`,
		// hanging left from 150, ran through the rule at 89. Each now keeps to its own side of the rule, and
		// the ids are drawn in code, whose ellipsis is one monospace cell.
		const placed = placedLabels(
			[
				{ x: 89.14581430745815, label: "car-paid-off", code: true },
				{ x: 154.46412988330798, label: "net-worth-ten-million", code: true },
			],
			294,
		)
		expect(placed.map((label) => label.text)).toEqual(["car-pai…", "net-wor…"])
		expect(placed.map((label) => label.row)).toEqual([0, 1])
		// Seven characters and the ellipsis on each side: 93 + 56 ends before the rule at 154, and 150 − 56
		// starts after 89.
		expect(93.14581430745815 + 7 * 7 + 7).toBeLessThan(154.46412988330798)
		expect(150.46412988330798 - (7 * 7 + 7)).toBeGreaterThan(89.14581430745815)
	})
})
