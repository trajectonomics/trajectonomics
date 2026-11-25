import type { Scenario } from "@trajectonomics/core/sim"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { BREAKDOWN_FLOWS } from "./projection-breakdown-flows"

/*
 * The plan `projection run --breakdown` is pinned on (cli ADR-0058). Every amount is a round number
 * with no growth or interest, so each line of the cash flow can be worked out by hand, and every
 * line the goldens show is one the plan puts in. Amounts are THB, at two places. It holds:
 *
 * - a Levy refund: 5% is taken at source from each salary, and 3% of the 2026 period's salary is due,
 *   so the settlement on 2027-02-15 is a refund of 1,800.00;
 * - categories: two named expenses and one that declares none;
 * - an unfunded Contribution: the salary left after the expenses funds 5,400.00 a month, the two
 *   Contributions ask for 7,000.00, so the second is cut by 1,600.00 each month;
 * - a planned withdrawal, borrowed from the loan in October 2026;
 * - a shortfall on 2026-09-15 that `cashflow.withdraw` draws from the investment Account.
 */
export const BREAKDOWN_SCENARIO: Scenario = {
	schemaVersion: 4,
	currency: "THB",
	economy: { inflation: 0 },
	accounts: [
		{ id: FIXTURE_ACCOUNTS.bank, kind: "asset", rate: 0 },
		{ id: FIXTURE_ACCOUNTS.cash, kind: "asset", rate: 0 },
		{ id: FIXTURE_ACCOUNTS.investment, kind: "asset", rate: 0 },
		{ id: FIXTURE_ACCOUNTS.locked, kind: "asset", rate: 0 },
		{ id: FIXTURE_ACCOUNTS.oldWallet, kind: "asset", rate: 0 },
		{ id: FIXTURE_ACCOUNTS.loan, kind: "liability", rate: 0 },
	],
	flows: [...BREAKDOWN_FLOWS],
	cashflow: {
		surplus: [
			{ account: FIXTURE_ACCOUNTS.cash, upTo: 100_000 },
			{ account: FIXTURE_ACCOUNTS.bank },
		],
		contribute: [FIXTURE_ACCOUNTS.investment],
		withdraw: [FIXTURE_ACCOUNTS.investment],
	},
	levies: [
		{
			id: "national",
			period: { month: 1, day: 1 },
			settlement: { month: 2, day: 15 },
			measures: [
				{ id: "gross", op: "tally", label: "salary", basis: "gross" },
				{ id: "due", op: "scale", of: "gross", num: 3, den: 100, rounding: "halfUp" },
			],
			due: "due",
			carryIn: [
				{
					periodStart: "2026-01-01",
					tallies: [{ label: "salary", basis: "gross", amount: 0 }],
					prepaid: 0,
				},
			],
		},
	],
}

/**
 * The same plan with the Levy's Carry-in left to the caller: a `--carry-in` for the period the document
 * states would be stated twice, so the flag's test needs a plan that states none.
 */
export const BREAKDOWN_BARE: Scenario = {
	...BREAKDOWN_SCENARIO,
	levies: (BREAKDOWN_SCENARIO.levies ?? []).map(({ carryIn: _carryIn, ...levy }) => levy),
}

/**
 * The plan with a car that the year's cash cannot pay (cli ADR-0058, addendum): the car is 1,000,000.00
 * on 2026-09-15, so the investment Account is drawn dry and the rest is the year's Shortfall.
 */
export const BREAKDOWN_SHORTFALL: Scenario = {
	...BREAKDOWN_SCENARIO,
	flows: BREAKDOWN_FLOWS.map((flow) =>
		flow.id === "car" ? { ...flow, amount: 100_000_000 } : flow,
	),
}

/**
 * The plan with a surplus that crosses a cap (cli ADR-0058, addendum): the salary is 30,000.00 a month,
 * and cash takes surplus only up to 700,000.00, so the rest of the year's surplus goes to the bank.
 */
export const BREAKDOWN_SURPLUS: Scenario = {
	...BREAKDOWN_SCENARIO,
	flows: BREAKDOWN_FLOWS.map((flow) =>
		flow.id === "salary" ? { ...flow, amount: 3_000_000 } : flow,
	),
	cashflow: {
		...BREAKDOWN_SCENARIO.cashflow,
		surplus: [
			{ account: FIXTURE_ACCOUNTS.cash, upTo: 70_000_000 },
			{ account: FIXTURE_ACCOUNTS.bank },
		],
	},
}
