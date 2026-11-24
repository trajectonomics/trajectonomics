import { describe, expect, test } from "bun:test"
import type { ErrorBody } from "../../contract"
import { DEMO } from "../what-if/fixtures.test-support"
import { milestoneDatesOf } from "./context"
import { CTX, DOC } from "./fixtures.test-support"
import { withdrawalsSummaryOf } from "./home"
import { layoutOf, withdrawalFieldOfRefusal, withdrawalShown } from "./refusal"
import { withdrawalsView } from "./view"

const run = (() => {
	const read = DEMO.reads.projections["base"]
	if (read === undefined || !read.ok) throw new Error("the Demo has base")
	return read.data
})()
const chance = (() => {
	const read = DEMO.reads.chance["base"]
	if (read === undefined || !read.ok) throw new Error("the Demo has a chance read")
	return read.data
})()

describe("what the rule pays, year by year", () => {
	test("each Rule year states its savings, its amount and what was paid, today's money, the share and the action in words", () => {
		const [rule] = withdrawalsView(run, null).rules
		expect(rule?.flow).toBe("retirement-spending")
		expect(rule?.rows).toHaveLength(4)
		expect(rule?.rows[0]).toMatchObject({
			from: "1 Jun 2050",
			portfolio: "21568998.89",
			amount: "862759.95",
			realAmount: "429677.39",
			paid: "862759.95",
			realPaid: "429677.39",
			share: "3.99%",
			action: "Followed the rule",
			marked: false,
		})
		expect(rule?.rows[2]).toMatchObject({
			action: "Cut: the share had grown too large",
			marked: true,
		})
	})

	test("a plan with no rule has no Rule years, and the other plan of the Demo is one", () => {
		const other = DEMO.reads.projections["retire-early"]
		if (other === undefined || !other.ok) throw new Error("the Demo has retire-early")
		expect(withdrawalsView(other.data, null).rules).toEqual([])
		expect(withdrawalsSummaryOf(other.data)).toBeNull()
	})

	test("a portfolio worth nothing has no share, as the CLI states none", () => {
		const copy = structuredClone(run)
		const table = copy.tables.find((one) => one.name === "spendingRules")
		if (table?.name !== "spendingRules" || table.rows[0] === undefined) throw new Error("no table")
		delete table.rows[0].withdrawalRate
		expect(withdrawalsView(copy, null).rules[0]?.rows[0]?.share).toBeNull()
	})

	test("the Home card states the first Rule year's amount and its share", () => {
		expect(withdrawalsSummaryOf(run)).toEqual({
			amount: "862759.95",
			share: "3.99%",
			from: "1 Jun 2050",
			currency: "THB",
		})
	})

	test("the reached Milestones' fire dates come from the run", () => {
		expect(milestoneDatesOf(run)["car-paid-off"]).toBe("2031-01-01")
		expect(milestoneDatesOf(null)).toEqual({})
	})
})

describe("in good and bad markets", () => {
	const bands = withdrawalsView(null, chance).bands

	test("the Bands are the CLI's five Percentiles per roll-up and the chance share is its own", () => {
		expect(bands?.series.map((one) => one.name)).toEqual(["P10", "P25", "P50", "P75", "P90"])
		expect(bands?.series[0]?.points).toHaveLength(chance.spendingBands?.length ?? -1)
		expect(bands).toMatchObject({ counted: 200, paths: 200 })
		expect(withdrawalsView(null, chance).chance).toEqual({
			share: "100.00%",
			succeeded: 200,
			paths: 200,
			horizon: "31 Dec 2053",
		})
	})

	test("the lowest year is labelled by level in plain words and says how many paths it counts", () => {
		expect(bands?.counted).toBe(200)
		expect(bands?.lowest.map((one) => [one.level, one.words, one.amount])).toEqual([
			[10, "Worst 1 in 10 paths", "834762.68"],
			[25, "Worst 1 in 4 paths", "881429.72"],
			[50, "Middle path", "961981.80"],
			[75, "Best 1 in 4 paths", "1022563.40"],
			[90, "Best 1 in 10 paths", "1088708.88"],
		])
	})

	test("a plan with no rule has no Bands, and a Snapshot with no chance read none", () => {
		const other = DEMO.reads.chance["retire-early"]
		if (other === undefined || !other.ok) throw new Error("the Demo has retire-early")
		expect(withdrawalsView(null, other.data).bands).toBeNull()
		expect(withdrawalsView(run, null).bands).toBeNull()
	})
})

describe("a refusal lands on the field its path names", () => {
	const layout = layoutOf(
		{
			...DOC,
			flows: [
				...DOC.flows,
				{ id: "retirement-spending", kind: "expense", frequency: "monthly", start: "2026-10-31" },
			],
		},
		"retirement-spending",
		["rent"],
	)
	const refusal = (path: string, message = "The CLI's sentence."): ErrorBody => ({
		code: "invalid_input",
		exitCode: 2,
		message,
		path,
	})
	const field = (path: string) => withdrawalFieldOfRefusal(refusal(path), layout)

	test("the five rule codes are shown at their field, in the CLI's own words", () => {
		expect(field("document.flows.3.rule.portfolio.0")).toBe("portfolio")
		expect(field("document.flows.3.frequency")).toBe("frequency")
		expect(field("document.flows.3.rule.floor")).toBe("floor")
		expect(field("document.flows.retirement-spending.rule.rateBps")).toBe("rate")
		expect(field("document.flows.3.rule.upper.bps")).toBe("upper")
		expect(field("document.flows.3.rule")).toBe("how")
		const shown = withdrawalShown(
			{},
			refusal("document.flows.3.rule.portfolio.0"),
			"A spending rule's portfolio names a liability.",
			layout,
		)
		expect(shown.at("portfolio")).toBe("A spending rule's portfolio names a liability.")
		expect(shown.at("rate")).toBeUndefined()
		expect(shown.general).toBeUndefined()
	})

	test("the next12Months refusal is shown at the start, and a stopped expense's own path at the list", () => {
		expect(field("document.milestones.0.criteria.0.metric.expenses")).toBe("start")
		expect(field("document.flows.1.endAt")).toBe("stops")
		expect(field("document.flows.2.endAt")).toBeNull()
	})

	test("a refusal that names none of them, or a message with no refusal, is for the whole form", () => {
		expect(withdrawalShown({}, refusal("document.currency"), "No.", layout).general).toBe("No.")
		expect(withdrawalShown({}, null, "The server was not reached.", layout).general).toBe(
			"The server was not reached.",
		)
		expect(CTX.asOf).toBe("2026-10-31")
	})
})
