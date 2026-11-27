import { describe, expect, test } from "bun:test"
import type { BaselineRateRow, BaselineRates } from "../../contract"
import { moneyOf } from "./money"

const WINDOW = { from: "2025-11-01", to: "2026-10-31" }

/** One row of a rates read, from a name and whatever a test changes. */
function row(
	name: string,
	over: Partial<Omit<BaselineRateRow, "account">> & { id?: string } = {},
): BaselineRateRow {
	const { id = name.toLowerCase(), ...rest } = over
	return {
		account: { id, name },
		type: "expense",
		archived: false,
		firstMonth: "2025-11",
		lastMonth: "2026-10",
		monthsWithActivity: 12,
		total: "1200.00",
		frequency: "monthly",
		amount: "100.00",
		start: "2026-10-31",
		inTemplate: true,
		...rest,
	}
}

/** A rates read with the rows and totals a test states. */
function rates(
	rows: readonly BaselineRateRow[],
	monthsCovered = 12,
	monthly: { income: string | null; spending: string | null } = {
		income: "50000.00",
		spending: "20000.00",
	},
): BaselineRates {
	return {
		asOf: "2026-10-31",
		months: 12,
		window: WINDOW,
		covered: WINDOW,
		monthsCovered,
		firstTransactionDate: "2025-01-01",
		noTransactionsBefore: false,
		currency: "THB",
		rounding: "half-away-from-zero",
		rows: [...rows],
		totals: [
			{ type: "income", total: "600000.00", monthly: monthly.income },
			{ type: "expense", total: "240000.00", monthly: monthly.spending },
		],
	}
}

describe("moneyOf", () => {
	test("takes the totals path when the Snapshot holds no read at all", () => {
		expect(moneyOf(undefined)).toEqual({
			path: "totals",
			rows: [],
			leftOut: [],
			totals: { income: null, spending: null },
			monthsCovered: null,
		})
	})

	test("takes the totals path when the read covers fewer than three whole months", () => {
		const view = moneyOf(rates([row("Rent")], 2))
		expect(view.path).toBe("totals")
		expect(view.rows.map((one) => one.id)).toEqual(["rent"])
		expect(view.totals).toEqual({ income: "50000.00", spending: "20000.00" })
		expect(view.monthsCovered).toBe(2)
	})

	test("takes the totals path when no row would be carried in", () => {
		const view = moneyOf(rates([row("Rent", { inTemplate: false, leftOutBecause: "archived" })]))
		expect(view.path).toBe("totals")
		expect(view.rows).toEqual([])
		expect(view.leftOut).toEqual([{ name: "Rent", reason: "Closed account" }])
	})

	test("keeps the history path at three whole months", () => {
		const view = moneyOf(
			rates(
				[
					row("Salary", { type: "income", amount: "50000.00" }),
					row("Insurance", { frequency: "yearly", amount: "24000.00" }),
				],
				3,
			),
		)
		expect(view.path).toBe("history")
		expect(view.monthsCovered).toBe(3)
		expect(view.rows).toEqual([
			{
				id: "salary",
				name: "Salary",
				type: "income",
				frequency: "monthly",
				amount: "50000.00",
			},
			{
				id: "insurance",
				name: "Insurance",
				type: "expense",
				frequency: "yearly",
				amount: "24000.00",
			},
		])
	})

	test("states each left-out reason in the design's words", () => {
		const view = moneyOf(
			rates([
				row("Old", { inTemplate: false, leftOutBecause: "archived", archived: true }),
				row("Refunded", { inTemplate: false, leftOutBecause: "negative", total: "-10.00" }),
				row("Empty", { inTemplate: false, leftOutBecause: "zero", total: "0.00" }),
				row("Rent"),
			]),
		)
		expect(view.leftOut.map((one) => one.reason)).toEqual([
			"Closed account",
			"Refunds exceed spending",
			"Nets to zero",
		])
	})

	test("keeps the CLI's two monthly totals, by type", () => {
		const view = moneyOf(rates([row("Rent")], 6, { income: null, spending: "1.00" }))
		expect(view.totals).toEqual({ income: null, spending: "1.00" })
	})
})
