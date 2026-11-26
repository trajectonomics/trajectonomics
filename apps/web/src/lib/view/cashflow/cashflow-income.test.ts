import { describe, expect, test } from "bun:test"
import { layoutFlow } from "../../chart/flow"
import { layoutStack } from "../../chart/flow-stack"
import { itemNames } from "../item-names"
import type { CashflowLine } from "./cashflow"
import { rollupsOf, sectionsOf } from "./cashflow"
import { flowOf } from "./cashflow-flow"
import { lineLabel, rowKeyOf } from "./cashflow-labels"
import { cashflowRunFixture } from "./fixtures.test-support"

const NAMES = itemNames(
	new Map([
		["fund", "Dividend fund"],
		["pension", "Provident fund"],
	]),
	null,
)

const line = (
	group: CashflowLine["group"],
	id: string | null,
	account: string,
	amount: string,
): CashflowLine => ({
	index: 0,
	from: "2026-10-31",
	to: "2027-10-30",
	group,
	id,
	account,
	category: null,
	amount,
})

/** Year zero with the CLI's `payout` and `employer` lines added to the fixture's own. */
function rollup() {
	const run = cashflowRunFixture()
	const table = run.tables.find((one) => one.name === "cashflow")
	if (table?.name !== "cashflow") throw new Error("no cash flow table")
	table.rows.push(
		line("payout", null, "fund", "3500.00"),
		line("employer", "salary-employer", "pension", "6000.00"),
	)
	const first = rollupsOf(run)[0]
	if (first === undefined) throw new Error("no roll-up")
	return first
}

describe("payouts on the Cash flow page", () => {
	test("a payout is its own line under money in, after the declared income, named for the Account that paid it", () => {
		const money = sectionsOf(rollup()).find((section) => section.total === "money in")
		const lines = money?.parts[0]?.lines ?? []
		expect(lines.map((one) => one.group)).toEqual(["income", "payout"])
		expect(lines.map((one) => lineLabel(one, NAMES))).toEqual([
			"salary",
			"Paid out by Dividend fund",
		])
		expect(money?.amount).toBe("124500.00")
	})

	test("it is a source band of the diagram, with its own kind and the CLI's amount", () => {
		const { sources } = flowOf(rollup(), NAMES)
		expect(sources.find((band) => band.kind === "payout")).toMatchObject({
			label: "Paid out by Dividend fund",
			amount: "3500.00",
		})
	})
})

describe("the employer's money on the Cash flow page", () => {
	test("is a section of its own with the CLI's amount, no total, and a note that it never reaches cash", () => {
		const section = sectionsOf(rollup()).find((one) => one.total === "from your employer")
		expect(section?.amount).toBeNull()
		expect(section?.note).toContain("never reaches your cash")
		expect(section?.parts[0]?.lines.map((one) => [lineLabel(one, NAMES), one.amount])).toEqual([
			["From your employer into Provident fund (salary-employer)", "6000.00"],
		])
	})

	test("the section is left out of a year in which the employer pays nothing", () => {
		const run = cashflowRunFixture()
		const first = rollupsOf(run)[0]
		if (first === undefined) throw new Error("no roll-up")
		expect(sectionsOf(first).map((one) => one.total)).not.toContain("from your employer")
	})

	test("it is one band in from the employer and one band on into the account, so the two columns stay as even as they were", () => {
		const flow = flowOf(rollup(), NAMES)
		const into = flow.uses.find((band) => band.kind === "employer")
		const from = flow.sources.find((band) => band.kind === "employer")
		expect([from?.amount, into?.amount]).toEqual(["6000.00", "6000.00"])
		expect(from?.key).not.toBe(into?.key)
		expect(rowKeyOf(into?.key ?? "")).toBe(from?.key ?? "")
		const keys = layoutFlow(flow).links.map((link) => link.key)
		expect(new Set(keys).size).toBe(keys.length)
	})

	test("the phone layout has a row for every band of the wide one, each with the CLI's amount, and the employer's money in both lists", () => {
		const flow = flowOf(rollup(), NAMES)
		const wide = layoutFlow(flow)
		const stack = layoutStack(flow)
		expect(stack.rows.map((row) => [row.key, row.amount])).toEqual(
			wide.nodes.map((node) => [node.key, node.amount]),
		)
		const sides = (kind: string) =>
			stack.rows.filter((row) => row.kind === kind).map((row) => row.side)
		expect(sides("employer")).toEqual(["source", "use"])
		expect(sides("payout")).toEqual(["source"])
		expect(stack.rows.find((row) => row.kind === "payout")?.label).toBe("Paid out by Dividend fund")
	})
})
