import { income } from "../engine/test-flows"
import type { Fixture } from "../fixtures/fixture"
import type { Account, Flow } from "../types"

const cash: Account = { id: "cash", kind: "asset", rate: 0 }
const loan: Account = { id: "loan", kind: "liability", rate: 600, compounding: "monthly" }

/** A 100,000.00 loan at 6% nominal monthly, repaid by a level Contribution on each month end. */
export const levelLoanMonth: Fixture = {
	baseline: {
		schemaVersion: 1,
		balances: [
			{ account: "cash", amount: 0 },
			{ account: "loan", amount: 10_000_000 },
		],
	},
	scenario: {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [cash, loan],
		flows: [
			income("pay", 1_000_000, { frequency: "monthly", start: "2026-01-01" }),
			{
				id: "repay",
				kind: "contribution",
				target: "loan",
				frequency: "monthly",
				start: "2026-01-31",
				level: { principal: 10_000_000, payments: 12, rounding: "ceil" },
			} satisfies Flow,
		],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
	},
	timeline: { start: "2025-12-31", horizon: "2026-12-31", resolution: "month" },
}

/** A 500,000.00 planned withdrawal from a liability on one day, with a same-day expense it pays. */
export const borrowDay: Fixture = {
	baseline: {
		schemaVersion: 1,
		balances: [
			{ account: "cash", amount: 0 },
			{ account: "loan", amount: 0 },
		],
	},
	scenario: {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [cash, { id: "loan", kind: "liability", rate: 0 }],
		flows: [
			{
				id: "borrow",
				kind: "withdrawal",
				source: "loan",
				frequency: "once",
				start: "2026-03-15",
				amount: 50_000_000,
				growth: { bps: 0 },
			},
			{
				id: "rent",
				kind: "expense",
				frequency: "once",
				start: "2026-03-15",
				amount: 3_000_000,
				growth: { bps: 0 },
			},
		],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
	},
	timeline: { start: "2026-03-14", horizon: "2026-03-16", resolution: "day" },
}

export const LOAN_CASES: readonly Fixture[] = [levelLoanMonth, borrowDay]
