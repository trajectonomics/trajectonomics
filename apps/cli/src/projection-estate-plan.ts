import type { Scenario } from "@trajectonomics/core/sim"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { PROJECTION_SCENARIO } from "./projection/testing"

/**
 * The fixture plan with an estate block (cli ADR-0064): a settlement cost of 1% of the gross estate, a
 * selling cost of 3% of the investment Account and a gift of 5% of the net estate. Every share is a
 * stated test value, as an estate line's always is. The help example `--estate` reads it.
 */
export const ESTATE_PLAN: Scenario = {
	...PROJECTION_SCENARIO,
	estate: {
		costs: [
			{ id: "settlement", of: "gross", bps: 100, rounding: "halfUp" },
			{
				id: "selling",
				of: { accounts: [FIXTURE_ACCOUNTS.investment] },
				bps: 300,
				rounding: "halfUp",
			},
		],
		gifts: [{ id: "temple", of: "net", bps: 500, rounding: "halfUp" }],
	},
}
