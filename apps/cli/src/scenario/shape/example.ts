import { HOME_ACCOUNTS, HOME_FLOWS } from "./example-home"
import { RETIREMENT_FLOWS } from "./example-retirement"

/**
 * The one worked example `traj schema scenario apply` publishes: a salary, rent, a monthly
 * investment, a debt payment, a locked retirement Account and a car loan, so every unit and every
 * kind appears in a document a person can edit into their own. The loan is the three parts a
 * document already names (cli ADR-0059): a liability with a nominal `rate` and `compounding`, a
 * `withdrawal` that borrows the money once the plan starts, and a Contribution into it with a
 * `level` payment. It carries no Levy, because `traj scenario tax`
 * writes one (ADR-0032), and `lockedUntil` names the retirement Account's lock. Its one Milestone
 * fires when the accessible net worth reaches 100,000 THB in start-of-plan money and the date
 * passes; the salary, the rent and the monthly investment stop when it fires (`endAt`), and from then a
 * Spending rule pays for life out of the savings (`retirement-spending`, cli ADR-0063). `schemaVersion` is
 * stamped by the caller for the same reason the template's is (ADR-0024): the pin's number is
 * asked of the core, never written down here.
 */
const EXAMPLE_BODY = {
	currency: "THB",
	economy: { inflation: 300 },
	accounts: [
		{ id: "cash", kind: "asset", rate: 150 },
		{ id: "index", kind: "asset", rate: 600, compounding: "annual" },
		{ id: "pension", kind: "asset", rate: 400, lockedUntil: "2051-01-01" },
		{ id: "loan", kind: "liability", rate: 500 },
		{ id: "car", kind: "liability", rate: 600, compounding: "monthly" },
		...HOME_ACCOUNTS,
	],
	flows: [
		{
			id: "salary",
			kind: "income",
			earned: true,
			amount: 100_000,
			frequency: "monthly",
			start: "2026-01-01",
			growth: "inflation",
			endAt: "retire",
		},
		{
			id: "rent",
			kind: "expense",
			amount: 20_000,
			frequency: "monthly",
			start: "2026-01-01",
			growth: { bps: 200 },
			endAt: "retire",
		},
		{
			id: "invest",
			kind: "contribution",
			target: "index",
			amount: 10_000,
			frequency: "monthly",
			start: "2026-01-01",
			growth: "inflation",
			endAt: "retire",
		},
		{
			id: "pay",
			kind: "contribution",
			target: "loan",
			amount: 5_000,
			frequency: "monthly",
			start: "2026-01-01",
			growth: "inflation",
		},
		{
			id: "car-loan",
			kind: "withdrawal",
			source: "car",
			frequency: "once",
			start: "2027-01-01",
			amount: 2_400_000,
			growth: { bps: 0 },
		},
		{
			id: "car-pay",
			kind: "contribution",
			target: "car",
			frequency: "monthly",
			start: "2027-02-01",
			level: { principal: 2_400_000, payments: 60, rounding: "ceil" },
		},
		...HOME_FLOWS,
		...RETIREMENT_FLOWS,
	],
	milestones: [
		{
			id: "retire",
			combine: "all",
			criteria: [
				{
					id: "wealth",
					kind: "metric",
					metric: "accessibleNetWorth",
					op: "atLeast",
					amount: 10_000_000,
					terms: "real",
				},
				{ id: "age", kind: "date", on: "2045-01-01" },
			],
		},
	],
	cashflow: { surplus: [{ account: "cash" }], contribute: ["index"], withdraw: ["cash"] },
}

/** The example document, stamped with the version the pinned core accepts. */
export function scenarioExample(version: number): Record<string, unknown> {
	return { schemaVersion: version, ...EXAMPLE_BODY }
}
