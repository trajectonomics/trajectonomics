import type { Scenario } from "@trajectonomics/core/sim"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { PROJECTION_SCENARIO } from "./projection/testing"

/**
 * The fixture plan with an employer's share of 5% of the salary into the investment Account, which
 * also pays out 4% of its value a year each quarter and charges a fee of 1.5% a year (cli ADR-0067).
 * Every rate is a stated test value, as a rate in a document always is. The help example that shows
 * the cash flow of an employer's share, a payout and a fee reads it.
 */
export const INCOME_FIXTURE_PLAN: Scenario = {
	...PROJECTION_SCENARIO,
	accounts: PROJECTION_SCENARIO.accounts.map((account) =>
		account.id === FIXTURE_ACCOUNTS.investment && account.kind === "asset"
			? {
					...account,
					payout: { bps: 400, frequency: "quarterly", rounding: "floor" },
					fee: { bps: 150, rounding: "halfUp" },
				}
			: account,
	),
	flows: [
		...PROJECTION_SCENARIO.flows,
		{
			id: "employer-match",
			kind: "contribution",
			target: FIXTURE_ACCOUNTS.investment,
			funding: "employer",
			frequency: "monthly",
			start: "2026-04-01",
			derive: {
				measures: [
					{ id: "pay", op: "flow", flow: "salary" },
					{ id: "share", op: "scale", of: "pay", num: 5, den: 100, rounding: "floor" },
				],
				result: "share",
			},
		},
	],
}
