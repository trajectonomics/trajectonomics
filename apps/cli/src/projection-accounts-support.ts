import type { BalanceRow } from "./projection/balances-view"
import type { ProjectionRunView } from "./projection/run-view"
import { tableOf } from "./projection-run-support"
import { acceptedScenarioSchemaVersion } from "./scenario/document"
import { scenarioExample } from "./scenario/shape"
import { applyScenario } from "./scenario-test-support"
import { ledgerHome } from "./store/testing"

/*
 * The fixtures and readers the `projection run --accounts` tests share (cli ADR-0060): the worked
 * example of `traj schema scenario apply`, stored over an empty Ledger so that its own Accounts are
 * the only ones, and run for five years from the 15th, the day the home is bought and sold, so each
 * monthly row falls on its anniversaries: bought and financed on 15 July 2027, let and run until 1 June
 * 2030, and sold, with its loan repaid, on 15 July 2030.
 */

export const HOME_FLAGS: readonly string[] = [
	"--scenario",
	"example",
	"--as-of",
	"2026-01-15",
	"--horizon",
	"2031-01-01",
]

/** An empty Ledger with the worked example stored as the Scenario `example`. */
export async function exampleHome(): Promise<string> {
	const home = ledgerHome()
	const applied = await applyScenario(
		home,
		"example",
		scenarioExample(acceptedScenarioSchemaVersion() ?? 0),
	)
	if (applied.code !== 0) throw new Error(applied.err)
	return home
}

/** The balance rows of one Account, in date order. */
export function balancesOf(body: ProjectionRunView, account: string): BalanceRow[] {
	return tableOf(body, "balances").rows.filter((row) => row.account === account)
}

/** One Account's balance row on a date. */
export function balanceOn(body: ProjectionRunView, account: string, date: string): BalanceRow {
	const row = balancesOf(body, account).find((entry) => entry.date === date)
	if (row === undefined) throw new Error(`no ${account} balance on ${date}`)
	return row
}
