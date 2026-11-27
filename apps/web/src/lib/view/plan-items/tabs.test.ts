import { describe, expect, test } from "bun:test"
import { DEMO } from "../what-if/fixtures.test-support"
import { planDocument } from "./fixtures.test-support"
import { planTabs, tabIndexFor, tabOf } from "./tabs"

describe("the Plan's tab strip", () => {
	test("names the four tabs in the order they are laid out", () => {
		expect(planTabs(null).map((tab) => tab.id)).toEqual([
			"income",
			"expenses",
			"assets",
			"milestones",
		])
		expect(planTabs(null).map((tab) => tab.label)).toEqual([
			"Income",
			"Expenses",
			"Assets and debts",
			"Milestones",
		])
	})

	test("counts the items of the plan's document", () => {
		const counts = Object.fromEntries(planTabs(planDocument()).map((tab) => [tab.id, tab.count]))
		expect(counts).toEqual({ income: 3, expenses: 1, assets: 2, milestones: 0 })
	})

	test("reads the items value, and Income for one it does not know", () => {
		expect(tabOf("expenses")).toBe("expenses")
		expect(tabOf("assets")).toBe("assets")
		expect(tabOf("milestones")).toBe("milestones")
		expect(tabOf("")).toBe("income")
		expect(tabOf("nonsense")).toBe("income")
	})

	test("counts a home's loan once, on the home's card, as the tab draws it", () => {
		const read = DEMO.reads.documents.base
		if (read?.ok !== true) throw new Error("the Demo reads its base plan")
		// Bank, Fund, the condo (with its loan on its card) and the car loan.
		expect(planTabs(read.data.scenario.document).find((tab) => tab.id === "assets")?.count).toBe(4)
	})

	test("counts nothing without a document", () => {
		expect(planTabs(null).map((tab) => tab.count)).toEqual([0, 0, 0, 0])
	})

	test("moves by the keys the strip owns, and leaves the rest to the browser", () => {
		expect(tabIndexFor(4, 0, "ArrowRight")).toBe(1)
		expect(tabIndexFor(4, 3, "ArrowRight")).toBe(0)
		expect(tabIndexFor(4, 0, "ArrowLeft")).toBe(3)
		expect(tabIndexFor(4, 2, "Home")).toBe(0)
		expect(tabIndexFor(4, 1, "End")).toBe(3)
		expect(tabIndexFor(4, 1, "Tab")).toBeNull()
		expect(tabIndexFor(0, 0, "ArrowRight")).toBeNull()
	})
})
