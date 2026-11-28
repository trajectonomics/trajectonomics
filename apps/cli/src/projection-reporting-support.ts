import { FIXTURE_ACCOUNTS, FIXTURE_ROWS, seededHome } from "./ledger-fixture"
import { modelFile } from "./projection-chance-support"
import {
	REPORTING_RETURN_MODEL,
	REPORTING_RUN_OUT,
	REPORTING_SCENARIO,
} from "./projection-reporting-plan"
import { applyScenario } from "./scenario-test-support"
import type { RestoreRows } from "./store"

/*
 * A minimal Ledger for the Reporting goldens: only the Savings Account, which holds nothing, and no
 * Transactions. The projection's cash is then exactly what the plan's Flows put in, as sim ADR 0034's
 * worked case A states it, with no fixture balance to declare or explain.
 */
const REPORTING_ROWS: RestoreRows = {
	...FIXTURE_ROWS,
	account: FIXTURE_ROWS.account.filter((row) => row.id === FIXTURE_ACCOUNTS.savings),
	tx: [],
	posting: [],
	scenario: [],
}

/** The minimal home with the two Reporting plans stored, and a flat Return model written beside it. */
export async function reportingHome(): Promise<string> {
	const home = seededHome(REPORTING_ROWS)
	for (const [name, scenario] of [
		["reporting", REPORTING_SCENARIO],
		["reporting-run-out", REPORTING_RUN_OUT],
	] as const) {
		const applied = await applyScenario(home, name, scenario)
		if (applied.code !== 0) throw new Error(applied.err)
	}
	modelFile(home, REPORTING_RETURN_MODEL, "reporting-model.json")
	return home
}
