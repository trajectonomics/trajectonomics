import { type Read, type SnapshotReads, scenarioTax, type TaxNotes } from "../src/lib/contract"
import { hasTaxProfile, type StageTwoPlan } from "../src/lib/snapshot"
import { taxNotesFrom } from "../src/lib/view/tax-settings/notes"
import { runPlanned } from "./run-planned"
import { mapPool } from "./run-pool"
import type { RunContext } from "./run-traj"

/**
 * The tax-note reads of the plans that keep a tax profile; the CLI refuses `--from-stored`
 * on a plan that keeps none. The read is a dry run, so it stores nothing.
 */
export async function runTaxNotes(
	context: RunContext,
	plan: StageTwoPlan,
	documents: SnapshotReads["documents"],
	records: readonly unknown[],
): Promise<Record<string, Read<TaxNotes>>> {
	const eligible = Object.entries(plan.taxNotes).filter(([name]) => hasTaxProfile(documents[name]))
	const results = await mapPool(
		eligible,
		async ([name, planned]) =>
			[name, taxNotesFrom(await runPlanned(context, planned, scenarioTax, records))] as const,
	)
	return Object.fromEntries(results)
}
