import type { Scenario } from "@trajectonomics/core/sim"
import { FIXTURE_ACCOUNTS } from "../ledger-fixture"
import { PROJECTION_SCENARIO } from "./testing"

/** The yearly volatility the plan states for the investment Account, in basis points: 15%. */
export const PLAN_VOLATILITY = 1500

/**
 * The base plan whose investment Account also states a volatility, so `--return-model plan` has a
 * Return model to build (cli ADR-0068). The figure is a test value, never a default.
 */
export const VOLATILE_PLAN: Scenario = {
	...PROJECTION_SCENARIO,
	accounts: PROJECTION_SCENARIO.accounts.map((account) =>
		account.id === FIXTURE_ACCOUNTS.investment && account.kind === "asset"
			? { ...account, volatility: PLAN_VOLATILITY }
			: account,
	),
}
