import { describe, expect, test } from "bun:test"
import { LABEL_HALF, layoutFlow } from "../../chart/flow"
import type { ProjectionRun, Read } from "../../contract"
import { projectionRunFixture } from "../projection/fixtures.test-support"
import {
	accountNamesOf,
	chooseRollup,
	hasCashflow,
	pickedKey,
	rollupsOf,
	sectionsOf,
	yearLabel,
} from "./cashflow"
import { flowOf } from "./cashflow-flow"
import { lineLabel } from "./cashflow-labels"
import { cashflowRunFixture } from "./fixtures.test-support"

const ACCOUNTS = new Map([
	["acc-invest", "Investments"],
	["acc-loan", "Car loan"],
	["acc-fund", "Fund"],
	["acc-bank", "Bank"],
])

describe("hasCashflow", () => {
	test("a run with the cash flow table has it, and one without does not", () => {
		const withTable: Read<ProjectionRun> = { argv: [], ok: true, data: cashflowRunFixture() }
		const without: Read<ProjectionRun> = { argv: [], ok: true, data: projectionRunFixture() }
		expect(hasCashflow(withTable)).toBe(true)
		expect(hasCashflow(without)).toBe(false)
	})

	test("a failed or missing Read has none", () => {
		expect(hasCashflow(undefined)).toBe(false)
		const failed: Read<ProjectionRun> = {
			argv: ["projection", "run"],
			ok: false,
			error: { code: "x", exitCode: 1, message: "m" },
		}
		expect(hasCashflow(failed)).toBe(false)
	})
})

describe("rollupsOf and chooseRollup", () => {
	test("one roll-up per annual row, each with its own lines and totals", () => {
		const rollups = rollupsOf(cashflowRunFixture())
		expect(rollups.map((rollup) => rollup.index)).toEqual([0, 1, 2])
		expect(rollups[0]?.lines).toHaveLength(17)
		expect(rollups[0]?.totals).toHaveLength(9)
		expect(rollups[1]?.lines.map((line) => line.group)).toEqual([
			"income",
			"unmet",
			"expense",
			"category",
		])
		expect(rollups[2]).toMatchObject({ lines: [], totals: [], partial: true })
	})

	test("a requested year is chosen by its index, and anything else shows the first", () => {
		const rollups = rollupsOf(cashflowRunFixture())
		expect(chooseRollup(rollups, "1")?.index).toBe(1)
		expect(chooseRollup(rollups, "9")?.index).toBe(0)
		expect(chooseRollup(rollups, "")?.index).toBe(0)
		expect(chooseRollup([], "0")).toBeNull()
	})
})

describe("pickedKey", () => {
	test("a pick shows in the year it was made in, and not in another", () => {
		const pick = { index: 1, key: '["income","salary",null,null]' }
		expect(pickedKey(pick, 1)).toBe(pick.key)
		expect(pickedKey(pick, 0)).toBeNull()
		expect(pickedKey(null, 1)).toBeNull()
		expect(pickedKey(pick, undefined)).toBeNull()
	})
})

describe("sectionsOf", () => {
	const year = (index: number) => {
		const rollup = rollupsOf(cashflowRunFixture()).find((entry) => entry.index === index)
		if (rollup === undefined) throw new Error(`no roll-up ${index}`)
		return rollup
	}

	test("every section total is the CLI's own string, never a figure the page adds", () => {
		const sections = sectionsOf(year(0))
		expect(sections.map((section) => [section.total, section.amount])).toEqual([
			["money in", "124500.00"],
			["tax", "4200.00"],
			["withdrawals", "3000.00"],
			["drawn", "1500.00"],
			["spending", "50700.00"],
			["saving", "64800.00"],
			["not funded", "19200.00"],
			["left over", "4800.00"],
			["unmet", "0.00"],
		])
	})

	test("a section with no total row in the CLI has no amount, and is not totalled", () => {
		const rollup = year(1)
		const sections = sectionsOf({ ...rollup, totals: rollup.totals.slice(1) })
		expect(sections.find((section) => section.total === "money in")?.amount).toBeNull()
	})

	test("the spending section has two parts, by category and by expense, each a view of the same total", () => {
		const spending = sectionsOf(year(0)).find((section) => section.total === "spending")
		expect(spending?.parts.map((part) => part.heading)).toEqual(["by category", "by expense"])
		expect(spending?.parts[0]?.lines.map((line) => [line.group, line.id])).toEqual([
			["category", "housing"],
			["category", "food"],
			["category", "transport"],
			["category", null],
		])
		expect(spending?.parts[1]?.lines.map((line) => [line.group, line.id])).toEqual([
			["expense", "rent"],
			["expense", "food"],
			["expense", "fees"],
			["expense", "car"],
		])
	})

	test("the tax section groups the Prepayment and the settlement, which keeps its sign", () => {
		const tax = sectionsOf(year(0)).find((section) => section.total === "tax")
		expect(tax?.parts.map((part) => part.heading)).toEqual([null])
		expect(tax?.parts[0]?.lines.map((line) => [line.group, line.amount])).toEqual([
			["prepaid", "6000.00"],
			["settlement", "-1800.00"],
		])
	})
})

describe("flowOf", () => {
	test("a normal year draws income, the borrowed and drawn money, a refund, and the uses on the right", () => {
		const flow = flowOf(rollupsOf(cashflowRunFixture())[0] ?? fail(), ACCOUNTS)
		expect(flow.sources.map((band) => [band.kind, band.label, band.amount])).toEqual([
			["income", "salary", "120000.00"],
			["withdrawal", "borrow from Car loan", "3000.00"],
			["drawn", "Drawn from Fund", "1500.00"],
			["refund", "Refund, national", "1800.00"],
		])
		expect(flow.uses.map((band) => [band.kind, band.label])).toEqual([
			["tax", "Prepayment, national"],
			["spending", "housing"],
			["spending", "food"],
			["spending", "transport"],
			["spending", "Uncategorised"],
			["saving", "invest into Investments"],
			["saving", "extra into Investments"],
			["left-over", "Left over in Bank"],
		])
	})

	test("a Shortfall year draws its unmet money as a source, and no use for it", () => {
		const flow = flowOf(rollupsOf(cashflowRunFixture())[1] ?? fail(), ACCOUNTS)
		expect(flow.sources.map((band) => [band.kind, band.amount])).toEqual([
			["income", "1000.00"],
			["unmet", "500.00"],
		])
		expect(flow.uses.map((band) => band.kind)).toEqual(["spending"])
	})

	test("every label of each year's diagram lies inside the diagram's box", () => {
		for (const rollup of rollupsOf(cashflowRunFixture())) {
			const layout = layoutFlow(flowOf(rollup, ACCOUNTS))
			for (const node of layout.nodes) {
				expect(node.labelY - LABEL_HALF).toBeGreaterThanOrEqual(0)
				expect(node.labelY + LABEL_HALF).toBeLessThanOrEqual(layout.height)
			}
		}
	})

	test("a band's key is its line's key, so a table row can name the band it shows", () => {
		const rollup = rollupsOf(cashflowRunFixture())[0] ?? fail()
		const flow = flowOf(rollup, ACCOUNTS)
		const keys = new Set(
			rollup.lines.map((line) =>
				JSON.stringify([line.group, line.id, line.account, line.category]),
			),
		)
		for (const band of [...flow.sources, ...flow.uses]) expect(keys.has(band.key)).toBe(true)
	})
})

describe("labels", () => {
	test("an Account is named by its name, and an id the read does not name stays as it is", () => {
		const line = rollupsOf(cashflowRunFixture())[0]?.lines.find(
			(entry) => entry.group === "contribution",
		)
		if (line === undefined) throw new Error("a contribution line")
		expect(lineLabel(line, ACCOUNTS)).toBe("invest into Investments")
		expect(lineLabel(line, new Map())).toBe("invest into acc-invest")
	})

	test("a year's label gives its span, its ages, and a mark for a partial year", () => {
		const rollup = rollupsOf(cashflowRunFixture())[2] ?? fail()
		expect(yearLabel({ ...rollup, ages: [{ person: "me", age: 45 }], partial: false })).toBe(
			"31 Oct 2028 to 31 Dec 2028, ages me 45",
		)
		expect(yearLabel({ ...rollup, ages: [], partial: true })).toBe(
			"31 Oct 2028 to 31 Dec 2028, partial year",
		)
	})

	test("the account names come from the accounts Read, and none without one", () => {
		expect(accountNamesOf(undefined).size).toBe(0)
	})
})

function fail(): never {
	throw new Error("the fixture has the roll-up")
}
