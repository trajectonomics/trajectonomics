import { contribution, income } from "../engine/test-flows"
import type { Fixture } from "../fixtures/fixture"
import type { Account, Flow, Scenario, Timeline } from "../types"
import { levelLoanMonth } from "./loan-cases"

const cash: Account = { id: "cash", kind: "asset", rate: 0 }
const loan: Account = { id: "loan", kind: "liability", rate: 600, compounding: "monthly" }
const pay: Flow = income("pay", 1_000_000, { frequency: "monthly", start: "2026-01-01" })
const cashflow = { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] }

export function loanFixture(
	flows: readonly Flow[],
	timeline: Timeline,
	loanAmount = 10_000_000,
	accounts: readonly Account[] = [cash, loan],
): Fixture {
	const scenario: Scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [...accounts],
		flows,
		cashflow,
	}
	return {
		baseline: {
			schemaVersion: 1,
			balances: [
				{ account: "cash", amount: 0 },
				{ account: "loan", amount: loanAmount },
			],
		},
		scenario,
		timeline,
	}
}

/** The #276 loan with one extra 30,000.00 payment at the end of month four. */
export const extraPaymentLoan: Fixture = {
	...levelLoanMonth,
	baseline: {
		schemaVersion: 1,
		balances: [
			{ account: "cash", amount: 3_000_000 },
			{ account: "loan", amount: 10_000_000 },
		],
	},
	scenario: {
		...levelLoanMonth.scenario,
		flows: [
			...levelLoanMonth.scenario.flows,
			contribution("extra", "loan", 3_000_000, { frequency: "once", start: "2026-04-30" }),
		],
	},
}

/** A level payment on the 15th, with the horizon on 20 February: the first half-month's interest is unposted. */
export const midMonthLoan: Fixture = loanFixture(
	[
		pay,
		{
			id: "repay",
			kind: "contribution",
			target: "loan",
			frequency: "monthly",
			start: "2026-01-15",
			level: { principal: 10_000_000, payments: 12, rounding: "ceil" },
		},
	],
	{ start: "2025-12-31", horizon: "2026-02-20", resolution: "day" },
)

/** A 100,000.00 planned withdrawal on 15 March, with nothing repaid. */
export const borrowedLoan: Fixture = loanFixture(
	[
		pay,
		{
			id: "borrow",
			kind: "withdrawal",
			source: "loan",
			frequency: "once",
			start: "2026-03-15",
			amount: 10_000_000,
			growth: { bps: 0 },
		},
	],
	{ start: "2025-12-31", horizon: "2026-04-30", resolution: "month" },
	0,
)
