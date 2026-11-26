import { describe, expect, test } from "bun:test"
import { type ItemNames, itemNames } from "../item-names"
import type { CashflowLine } from "./cashflow"
import { rollupsOf } from "./cashflow"
import { flowOf } from "./cashflow-flow"
import { lineLabel, lineWords } from "./cashflow-labels"
import { YEAR_ZERO_LINES } from "./fixture-lines.test-support"
import { cashflowRunFixture } from "./fixtures.test-support"

const ACCOUNTS = new Map([
	["acc-invest", "Investments"],
	["acc-loan", "Car loan"],
])

/** One line of the fixture's first year: a Flow, a Levy or a category, by its group and id. */
function lineOf(group: CashflowLine["group"], id: string | null): CashflowLine {
	const line = YEAR_ZERO_LINES.find((one) => one.group === group && one.id === id)
	if (line === undefined) throw new Error(`the fixture has no ${group} line for ${id}`)
	return line
}

/**
 * The lookup for the fixture's lines, with a `displayLabel` on each Flow in `labels`. The lookup reads an item's id and
 * label only, so one kind stands in for every Flow here.
 */
function plan(labels: Record<string, string>): ItemNames {
	const flows = Object.entries(labels).map(([id, displayLabel]) => ({
		id,
		kind: "expense" as const,
		frequency: "monthly" as const,
		start: "2026-10-31",
		displayLabel,
	}))
	return itemNames(ACCOUNTS, null, { currency: "THB", accounts: [], flows })
}

describe("a cash flow line names its Flow as the plan does", () => {
	test("a labelled Flow shows its label, and a Flow the plan states no label for shows its id", () => {
		const names = plan({ salary: "Your salary" })
		expect(lineLabel(lineOf("income", "salary"), names)).toBe("Your salary")
		expect(lineLabel(lineOf("expense", "rent"), names)).toBe("rent")
		expect(lineLabel(lineOf("income", "salary"), itemNames(ACCOUNTS, null))).toBe("salary")
	})

	test("an unnamed Flow's words are its id, marked so a page can set it in code", () => {
		const names = plan({ salary: "Your salary" })
		expect(lineWords(lineOf("income", "salary"), names)).toEqual([
			{
				item: {
					text: "Your salary",
					named: true,
					kind: "flow",
					id: "salary",
				},
			},
		])
		expect(lineWords(lineOf("expense", "rent"), names)).toEqual([
			{ item: { text: "rent", named: false, kind: "flow", id: "rent" } },
		])
	})

	test("two Flows that share a label read the label and their id, so the page tells them apart", () => {
		const names = plan({ salary: "Pay", food: "Pay" })
		expect(lineLabel(lineOf("income", "salary"), names)).toBe("Pay (salary)")
		expect(lineLabel(lineOf("expense", "food"), names)).toBe("Pay (food)")
	})

	test("a Levy and a category are not Flows: each keeps the CLI's own words", () => {
		const names = plan({ national: "National insurance", housing: "Housing" })
		expect(lineLabel(lineOf("prepaid", "national"), names)).toBe("Prepayment, national")
		expect(lineLabel(lineOf("category", "housing"), names)).toBe("housing")
	})

	test("the Account in a line's label is the ledger's name, and the Flow is the plan's", () => {
		const names = plan({ invest: "Savings plan" })
		expect(lineLabel(lineOf("contribution", "invest"), names)).toBe("Savings plan into Investments")
		const noLedger = itemNames(new Map(), null, {
			currency: "THB",
			accounts: [],
			flows: [
				{
					id: "invest",
					kind: "contribution",
					frequency: "monthly",
					start: "2026-10-31",
					displayLabel: "Savings plan",
				},
			],
		})
		expect(lineLabel(lineOf("contribution", "invest"), noLedger)).toBe(
			"Savings plan into acc-invest",
		)
	})
})

describe("the cash flow diagram's labels", () => {
	test("a band's label is the plan's words for its Flow, as plain text for the chart", () => {
		const rollup = rollupsOf(cashflowRunFixture())[0]
		if (rollup === undefined) throw new Error("the fixture has a first year")
		const flow = flowOf(rollup, plan({ salary: "Your salary" }))
		expect(flow.sources.map((band) => band.label)).toContain("Your salary")
		expect(flow.uses.map((band) => band.label)).toContain("Prepayment, national")
		expect(flowOf(rollup, itemNames(ACCOUNTS, null)).sources.map((band) => band.label)).toContain(
			"salary",
		)
	})
})
