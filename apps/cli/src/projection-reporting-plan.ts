import type { ReturnModel, Scenario } from "@trajectonomics/core/sim"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"

/*
 * The plan the Reporting year and month goldens are pinned on (cli ADR-0086, sim ADR 0034 case A).
 * The Savings Account holds nothing, so the cash the projection moves is only what the two Flows
 * put in: pay 1,000.00 on the 30th from 2026-11-30, and rent 600.00 on the 1st from 2026-12-01. No
 * growth and no interest, so every line and total below can be worked out by hand.
 */

/** The timeline of case A: an As-of mid-November and a horizon mid-February, so both ends are cut. */
export const REPORTING_AS_OF = "2026-11-15"

/** The horizon of case A, ten days into 2027-02. */
export const REPORTING_HORIZON = "2027-02-10"

export const REPORTING_SCENARIO: Scenario = {
	schemaVersion: 4,
	currency: "THB",
	economy: { inflation: 0 },
	accounts: [{ id: FIXTURE_ACCOUNTS.savings, kind: "asset", rate: 0 }],
	flows: [
		{
			id: "pay",
			kind: "income",
			earned: true,
			amount: 100_000,
			frequency: "monthly",
			start: "2026-11-30",
			growth: { bps: 0 },
		},
		{
			id: "rent",
			kind: "expense",
			amount: 60_000,
			frequency: "monthly",
			start: "2026-12-01",
			growth: { bps: 0 },
		},
	],
	cashflow: {
		surplus: [{ account: FIXTURE_ACCOUNTS.savings }],
		contribute: [],
		withdraw: [FIXTURE_ACCOUNTS.savings],
	},
}

/**
 * The plan of case B: 1,000.00 fills the Savings Account on 1 January, rent takes 400.00 a month
 * from the 10th, and a pay of 100.00 on 5 March cannot cover March's rent, so the money runs out on
 * 2026-03-10 with 100.00 unmet.
 */
export const REPORTING_RUN_OUT: Scenario = {
	schemaVersion: 4,
	currency: "THB",
	economy: { inflation: 0 },
	accounts: [{ id: FIXTURE_ACCOUNTS.savings, kind: "asset", rate: 0 }],
	flows: [
		{
			id: "fill",
			kind: "income",
			earned: true,
			amount: 100_000,
			frequency: "once",
			start: "2026-01-01",
			growth: { bps: 0 },
		},
		{
			id: "pay",
			kind: "income",
			earned: true,
			amount: 10_000,
			frequency: "once",
			start: "2026-03-05",
			growth: { bps: 0 },
		},
		{
			id: "rent",
			kind: "expense",
			amount: 40_000,
			frequency: "monthly",
			start: "2026-01-10",
			growth: { bps: 0 },
		},
	],
	cashflow: {
		surplus: [{ account: FIXTURE_ACCOUNTS.savings }],
		contribute: [],
		withdraw: [FIXTURE_ACCOUNTS.savings],
	},
}

/** A flat Return model over the Savings Account, so a path's figures are the plan's own. */
export const REPORTING_RETURN_MODEL: ReturnModel = {
	id: "reporting-flat",
	accounts: [FIXTURE_ACCOUNTS.savings],
	buckets: [{ returnsBps: [0], weight: 4_294_967_296 }],
}
