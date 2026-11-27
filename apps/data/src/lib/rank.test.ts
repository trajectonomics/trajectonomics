import { describe, expect, test } from "bun:test"
import { rankBy } from "./rank"

type Row = { id: string; value: number | null }

const rows: Row[] = [
	{ id: "a", value: 10 },
	{ id: "b", value: null },
	{ id: "c", value: 30 },
	{ id: "d", value: 10 },
]

describe("rankBy", () => {
	test("puts the largest first and keeps the input order on a tie", () => {
		expect(rankBy(rows, (row) => row.value).map((row) => row.id)).toEqual(["c", "a", "d", "b"])
	})

	test("puts every row with no number last", () => {
		expect(rankBy(rows, (row) => row.value).at(-1)?.id).toBe("b")
	})

	test("does not change the input", () => {
		const copy = [...rows]
		rankBy(rows, (row) => row.value)
		expect(rows).toEqual(copy)
	})

	test("has an empty list for no rows", () => {
		expect(rankBy([], (row: Row) => row.value)).toEqual([])
	})
})
