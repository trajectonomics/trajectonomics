import { describe, expect, test } from "bun:test"
import { demoSnapshotText } from "../../../scripts/demo-snapshot"
import { baselineRates } from "./baseline-rates"
import { snapshot } from "./snapshot"

const ROW = {
	account: { id: "acc-1", name: "Salary" },
	type: "income",
	archived: false,
	firstMonth: "2025-11",
	lastMonth: "2026-10",
	monthsWithActivity: 12,
	total: "600000.00",
	frequency: "monthly",
	amount: "50000.00",
	start: "2026-10-31",
	inTemplate: true,
}

const RESULT = {
	asOf: "2026-10-31",
	months: 12,
	window: { from: "2025-11-01", to: "2026-10-31" },
	covered: { from: "2025-11-01", to: "2026-10-31" },
	monthsCovered: 12,
	firstTransactionDate: "2024-11-01",
	noTransactionsBefore: false,
	currency: "THB",
	rounding: "half-away-from-zero",
	rows: [ROW],
	totals: [
		{ type: "income", total: "600000.00", monthly: "50000.00" },
		{ type: "expense", total: "0.00", monthly: "0.00" },
	],
}

describe("the baseline rates contract", () => {
	test("keeps money a decimal string and states the window, rows and totals", () => {
		const parsed = baselineRates.parse(RESULT)
		expect(parsed.rows[0]?.amount).toBe("50000.00")
		expect(parsed.totals.map((total) => total.type)).toEqual(["income", "expense"])
	})

	test("refuses a word the CLI does not state, and a key it does not state", () => {
		const row = (change: object) => ({ ...RESULT, rows: [{ ...ROW, ...change }] })
		expect(baselineRates.safeParse(row({ frequency: "weekly" })).success).toBe(false)
		expect(baselineRates.safeParse(row({ type: "transfer" })).success).toBe(false)
		expect(baselineRates.safeParse(row({ leftOutBecause: "closed" })).success).toBe(false)
		expect(baselineRates.safeParse({ ...RESULT, extra: 1 }).success).toBe(false)
	})

	test("decodes a Snapshot saved before the rates read", async () => {
		const demo = snapshot.parse(JSON.parse(await demoSnapshotText()))
		const reads: Record<string, unknown> = { ...demo.reads }
		delete reads["rates"]
		expect(snapshot.safeParse({ ...demo, reads }).success).toBe(true)
	})
})
