import { describe, expect, it } from "bun:test"
import { agesColumn } from "../projection/render"
import { type ColumnHint, tableLines } from "./lines"

const columns: readonly ColumnHint[] = [
	{ key: "index", label: "index", align: "right" },
	agesColumn,
]

describe("a column's show callback", () => {
	it("prints what it returns in place of the row's value, and still pads the cell", () => {
		const ages = [
			{ person: "me", age: 37 },
			{ person: "kid", age: 5 },
		]
		const text = tableLines("annual", 1, [{ index: 0, ages }], columns)
		expect(text).toBe("annual (1 row)\nindex  ages\n    0  me 37, kid 5")
	})

	it("receives the row's raw value, `undefined` included when the row does not state the key", () => {
		const seen: unknown[] = []
		const text = tableLines(
			"rows",
			1,
			[{ index: 0 }],
			[
				{ key: "index", label: "index" },
				{
					key: "ages",
					label: "ages",
					show: (value) => {
						seen.push(value)
						return value
					},
				},
			],
		)
		expect(seen).toEqual([undefined])
		expect(text).toBe("rows (1 row)\nindex  ages\n0")
	})

	it("escapes what it returns as any other cell, so it cannot break the row", () => {
		const text = tableLines(
			"rows",
			1,
			[{ cell: "x" }],
			[{ key: "cell", label: "cell", show: () => "a\nb" }],
		)
		expect(text).toBe("rows (1 row)\ncell\na\\nb")
	})
})
