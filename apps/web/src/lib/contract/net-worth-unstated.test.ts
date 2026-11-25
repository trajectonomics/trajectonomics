import { describe, expect, test } from "bun:test"
import { balance } from "./balance"
import { netWorth } from "./net-worth"
import { netWorthMonthly } from "./net-worth-monthly"
import { pnl } from "./pnl"

const ERROR = {
	code: "AMOUNT_OVERFLOW",
	exitCode: 3,
	message: "totals[THB]: exceeds the safe integer range",
	path: "totals[THB]",
}
const START = { firstTransactionDate: "2026-01-01", noTransactionsBefore: false }

describe("a net worth total the CLI does not state (cli ADR 0079)", () => {
	test("parses `report networth` with a null total and the refusal, and still needs the key", () => {
		const data = { asOf: "2026-03-31", ...START, rows: [], totals: null, totalsError: ERROR }
		expect(netWorth.parse(data)).toEqual(data)
		expect(netWorth.safeParse({ ...data, totals: undefined }).success).toBe(false)
	})

	test("parses `balance` with a null total and the refusal", () => {
		const data = { asOf: "2026-03-31", rows: [], netWorth: null, netWorthError: ERROR }
		expect(balance.parse(data)).toEqual(data)
	})

	test("parses a month of `--monthly` whose total is not stated beside one that is", () => {
		const month = { asOf: "2026-01-31", ...START, rows: [] }
		const data = {
			since: null,
			until: "2026-02-28",
			months: [
				{ ...month, totals: [{ currency: "THB", amount: "1.00" }] },
				{ ...month, asOf: "2026-02-28", totals: null, totalsError: ERROR },
			],
		}
		expect(netWorthMonthly.parse(data)).toEqual(data)
	})

	test("parses `balance` whose trial balance has rows and no totals, and `report pnl` with no total", () => {
		const trialError = { ...ERROR, path: "trialBalance.totals[THB].debit" }
		const trial = { rows: [], totals: null, totalsError: trialError }
		const data = { asOf: "2026-03-31", rows: [], netWorth: null, trialBalance: trial }
		expect(balance.parse(data)).toEqual(data)
		const report = { since: null, until: "2026-03-31", project: null, rows: [], totals: null }
		expect(pnl.parse({ ...report, totalsError: ERROR })).toEqual({ ...report, totalsError: ERROR })
		expect(pnl.safeParse({ ...report, totals: undefined }).success).toBe(false)
	})
})
