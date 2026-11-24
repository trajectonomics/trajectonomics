import { ledgerHome } from "../../store/testing"
import { capture } from "../../test-support"
import type { ValuationRaised } from "./codes"

/** Adds each `[name, type]` account to a fresh THB ledger and runs `account value` against it. */
async function refused(
	accounts: readonly (readonly [string, string])[],
	valued: string,
	against: string,
) {
	const home = ledgerHome()
	for (const [name, type] of accounts) {
		await capture(["account", "add", name, "--type", type, "--currency", "THB", "--json"], {
			TRAJ_HOME: home,
		})
	}
	const flags = ["--value", "1.00", "--date", "2026-11-22", "--against", against, "--json"]
	return capture(["account", "value", valued, ...flags], { TRAJ_HOME: home })
}

/** One real command line per code `account value` raises itself (the contract test's triggers). */
export const valuationTriggers: Record<ValuationRaised, () => ReturnType<typeof capture>> = {
	valuation_account_invalid: () =>
		refused(
			[
				["Food", "expense"],
				["Gains", "income"],
			],
			"Food",
			"Gains",
		),
	valuation_against_invalid: () =>
		refused(
			[
				["Fund", "asset"],
				["Food", "expense"],
			],
			"Fund",
			"Food",
		),
}
