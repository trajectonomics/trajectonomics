import { describe, expect, test } from "bun:test"
import { shownColumns, toggleHidden } from "./columns"

describe("hidden report fields", () => {
	test("showing a hidden field again removes it from the hidden list, and hiding adds it", () => {
		expect(toggleHidden([], "income")).toEqual(["income"])
		expect(toggleHidden(["income", "expense"], "income")).toEqual(["expense"])
	})

	test("a hidden field is left out of the shown fields, and the table's order is kept", () => {
		const columns = [
			{ key: "index", numeric: true },
			{ key: "income", numeric: true },
			{ key: "partial", numeric: false },
		]
		expect(shownColumns(columns, ["income"]).map((column) => column.key)).toEqual([
			"index",
			"partial",
		])
	})
})
