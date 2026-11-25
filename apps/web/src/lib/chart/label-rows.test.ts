import { describe, expect, test } from "bun:test"
import { placedLabels } from "./label-rows"

// Each character is 7px, a label stands 4px off its rule and two labels keep 6px between them.
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
		// Width 400: x 300 and 340 both hang left; "abcdefghij" at 340 stops at the rule at 300 and still
		// spans 301 to 336, over the label at 300 (226 to 296), so it takes the next row.
		const placed = placedLabels(
			[
				{ x: 300, label: "abcdefghij" },
				{ x: 340, label: "abcdefghij" },
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
		// 46px before the rule at 150: six characters, the last of them the ellipsis.
		const rightward = placedLabels(
			[
				{ x: 100, label: "abcdefghij" },
				{ x: 150, label: "k" },
			],
			600,
		)
		expect(rightward[0]?.text).toBe("abcde…")
		expect(100 + 4 + 6 * 7).toBeLessThan(150)

		// The same on the left: a label hanging left towards a rule 106px away keeps its whole text.
		const leftward = placedLabels(
			[
				{ x: 450, label: "abcdefghij" },
				{ x: 560, label: "abcdefghij" },
			],
			600,
		)
		expect(leftward[1]?.text).toBe("abcdefghij")
		// 26px between the rules at 450 and 480: three characters, the last of them the ellipsis.
		const tight = placedLabels(
			[
				{ x: 450, label: "abcdefghij" },
				{ x: 480, label: "abcdefghij" },
			],
			600,
		)
		expect(tight[1]?.text).toBe("ab…")
	})

	test("leaves a label out when a rule leaves no room for a word and an ellipsis", () => {
		const placed = placedLabels(
			[
				{ x: 100, label: "abcdefghij" },
				{ x: 110, label: "k" },
			],
			600,
		)
		expect(placed[0]?.text).toBe("")
		expect(placed[1]?.text).toBe("k")
	})

	test("a label that a neighbour's rule crossed, as Plans draws it on a 360px screen", () => {
		// Plans' card at 360px holds a 294px chart, and the Demo's base plan reaches its two Milestones at
		// these x. `car-paid-off` ran from 93 to 177 through the rule at 154, and `net-worth-ten-million`,
		// hanging left from 150, ran through the rule at 89. Each now keeps to its own side of the rule.
		const placed = placedLabels(
			[
				{ x: 89.14581430745815, label: "car-paid-off" },
				{ x: 154.46412988330798, label: "net-worth-ten-million" },
			],
			294,
		)
		expect(placed.map((label) => label.text)).toEqual(["car-pai…", "net-wor…"])
		expect(placed.map((label) => label.row)).toEqual([0, 1])
		// Eight characters on each side: 93 + 56 ends before the rule at 154, and 150 − 56 starts after 89.
		expect(93.14581430745815 + 8 * 7).toBeLessThan(154.46412988330798)
		expect(150.46412988330798 - 8 * 7).toBeGreaterThan(89.14581430745815)
	})
})
