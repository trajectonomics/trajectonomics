import type { Fixture } from "../fixtures/fixture"
import type { SurvivalOptions } from "../types"

/** One year of 50% growth across Feb 29 2028: a rounding tie plus the No Leap day count. */
export const leapTie: Fixture = {
	baseline: { schemaVersion: 1, balances: [{ account: "cash", amount: 1 }] },
	scenario: {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 300 },
		accounts: [{ id: "cash", kind: "asset", rate: 5000 }],
		flows: [],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: [] },
	},
	timeline: { start: "2027-02-28", horizon: "2029-03-01", resolution: "day" },
}

export const configured: SurvivalOptions = {
	method: "survival",
	reference: { multiplier: 30, basis: "netWorth", window: "trailing12Months", terms: "real" },
}
