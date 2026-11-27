import { describe, expect, it } from "bun:test"
import { type ColumnHint, tableLines } from "./lines"

/** `me 37, partner 35`: the callback `projection run` declares for its `ages` column. */
function agesText(value: unknown): unknown {
	if (!Array.isArray(value)) return value
	return value
		.map((entry) => {
			const { person, age } = entry as { person?: unknown; age?: unknown }
			return `${String(person)} ${String(age)}`
		})
		.join(", ")
}

const columns: readonly ColumnHint[] = [
	{ key: "index", label: "index", align: "right" },
	{ key: "ages", label: "ages", show: agesText },
]

describe("a column's show callback", () => {
	it("prints what it returns in place of the row's value, and still pads the cell", () => {
		const text = tableLines("annual", 1, [{ index: 0, ages: [{ person: "me", age: 37 }] }], columns)
		expect(text).toBe("annual (1 row)\nindex  ages\n    0  me 37")
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
			[{ cell: "a\nb" }],
			[{ key: "cell", label: "cell", show: (value) => value }],
		)
		expect(text).toBe("rows (1 row)\ncell\na\\nb")
	})
})
