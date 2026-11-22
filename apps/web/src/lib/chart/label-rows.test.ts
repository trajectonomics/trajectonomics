import { describe, expect, test } from "bun:test"
import { labelRows } from "./label-rows"

// Each character is 7px, a label stands 4px off its rule and two labels keep 6px between them.
describe("labelRows", () => {
	test("two markers on the same date take two rows", () => {
		expect(
			labelRows(
				[
					{ x: 100, label: "a" },
					{ x: 100, label: "b" },
				],
				600,
			),
		).toEqual([0, 1])
	})

	test("markers far apart share the top row", () => {
		// "ab" spans 104 to 118, so a label starting at 124 (x 120) fits beside it; one at 123 (x 119) does not.
		expect(
			labelRows(
				[
					{ x: 100, label: "ab" },
					{ x: 120, label: "c" },
				],
				600,
			),
		).toEqual([0, 0])
		expect(
			labelRows(
				[
					{ x: 100, label: "ab" },
					{ x: 119, label: "c" },
				],
				600,
			),
		).toEqual([0, 1])
	})

	test("a third marker goes back to the first row that is free", () => {
		const marks = [
			{ x: 50, label: "car" },
			{ x: 50, label: "home" },
			{ x: 200, label: "kid" },
		]
		expect(labelRows(marks, 600)).toEqual([0, 1, 0])
	})

	test("labels past the middle hang left of their rule and still never overlap", () => {
		// Width 200: x 150 and 160 both hang left; "abc" at 160 spans 135 to 156, over "abc" at 150 (125 to 146).
		expect(
			labelRows(
				[
					{ x: 150, label: "abc" },
					{ x: 160, label: "abc" },
				],
				200,
			),
		).toEqual([0, 1])
	})

	test("rows follow each marker's own index, whatever order the markers come in", () => {
		expect(
			labelRows(
				[
					{ x: 300, label: "z" },
					{ x: 10, label: "a" },
					{ x: 10, label: "b" },
				],
				600,
			),
		).toEqual([0, 0, 1])
	})
})
