import { describe, expect, test } from "bun:test"
import { buildCatalogue } from "./catalogue"
import { planNames, withExpenseFlows } from "./flow-fixtures.test-support"
import { cashflowFigures, seriesLabelId } from "./resolve-flows"

/** The visible names of the picker's entries, in order. */
function pickerNames(groups: ReturnType<typeof buildCatalogue>): string[] {
	return groups.flatMap((group) => group.entries.map((entry) => entry.name))
}

describe("the picker never lists two choices that read alike", () => {
	test("takes the selected plan's names, which its chart shows", () => {
		const both = withExpenseFlows(["a", "rent"])
		const names = planNames([{ id: "a", displayLabel: "rent" }, { id: "rent" }])
		const listed = pickerNames(
			buildCatalogue([withExpenseFlows(["a"]), withExpenseFlows(["rent"]), both], both, names),
		)
		expect(listed).toContain("Expense: rent (a)")
		expect(listed).toContain("Expense: rent (rent)")
		expect(listed.filter((name) => name === "Expense: rent")).toEqual([])
		expect(new Set(listed).size).toBe(listed.length)
	})

	test("tells apart two series the selected plan lacks that read alike", () => {
		const names = planNames([{ id: "a", displayLabel: "rent" }, { id: "rent" }])
		const listed = pickerNames(
			buildCatalogue([withExpenseFlows(["a"]), withExpenseFlows(["rent"])], null, names),
		)
		expect(listed).toContain("Expense: rent (a)")
		expect(listed).toContain("Expense: rent (rent)")
	})
})

describe("the item a series names", () => {
	test("is the Flow id, or words for a line that names none, never the series key", () => {
		expect(seriesLabelId('cash:["expense","rent",null,null]')).toBe("rent")
		expect(seriesLabelId('cash:["category",null,null,null]')).toBe("no category")
		expect(seriesLabelId("net-worth")).toBe("net-worth")
	})

	test("an uncategorised line beside a category named Uncategorised reads words, not a key", () => {
		const run = withExpenseFlows(["a"])
		const named = cashflowFigures(run).map((item) => item.name)
		expect(named.join("\n")).not.toContain("cash:[")
	})
})
