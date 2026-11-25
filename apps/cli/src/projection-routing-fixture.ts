import type { Scenario } from "@trajectonomics/core/sim"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { PROJECTION_SCENARIO } from "./projection/testing"

/**
 * The projection fixture's plan with the routing forms and two transfers (cli ADR-0070): the surplus keeps `cash` at
 * 10,000.00 in today's money, puts half of what is then left into the investment Account and the rest in the bank;
 * a shortfall draws `cash` down to 5,000.00 in today's money, then the bank, then the rest of `cash`. The investment
 * Account is rolled whole into the locked Account on 30 June, and 500.00 a month moves from the bank to pay the loan
 * down. Every figure is a stated example value. The help examples of `projection run` read it.
 */
export const ROUTED_FIXTURE_PLAN: Scenario = {
	...PROJECTION_SCENARIO,
	flows: [
		...PROJECTION_SCENARIO.flows,
		{
			id: "roll-investment",
			kind: "transfer",
			source: FIXTURE_ACCOUNTS.investment,
			target: FIXTURE_ACCOUNTS.locked,
			frequency: "once",
			start: "2026-06-30",
			derive: {
				measures: [{ id: "all", op: "account", account: FIXTURE_ACCOUNTS.investment }],
				result: "all",
			},
		},
		{
			id: "pay-loan",
			kind: "transfer",
			source: FIXTURE_ACCOUNTS.bank,
			target: FIXTURE_ACCOUNTS.loan,
			frequency: "monthly",
			start: "2026-04-30",
			amount: 50_000,
			growth: { bps: 0 },
		},
	],
	cashflow: {
		surplus: [
			{ account: FIXTURE_ACCOUNTS.cash, upTo: { amount: 1_000_000, growth: "inflation" } },
			{ account: FIXTURE_ACCOUNTS.investment, share: 5_000 },
			{ account: FIXTURE_ACCOUNTS.bank },
		],
		contribute: [FIXTURE_ACCOUNTS.investment],
		withdraw: [
			{ account: FIXTURE_ACCOUNTS.cash, downTo: { amount: 500_000, growth: "inflation" } },
			FIXTURE_ACCOUNTS.bank,
			FIXTURE_ACCOUNTS.cash,
		],
	},
}
