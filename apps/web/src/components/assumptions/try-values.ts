import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ScenarioDocument } from "../../lib/contract"
import { recordOf, withSet } from "../../lib/what-if/session"

/** What a try could not put in the session, so the form says it beside the ones it did. */
export interface TriedValues {
	/** Fields a what-if cannot clear: `traj` replaces a value in a what-if and cannot delete one. */
	readonly cleared: readonly string[]
	/** True when the inflation is not tried: the plan states none, and a what-if replaces a value the plan holds. */
	readonly inflationUntried: boolean
}

/** Whether two values of a document are the same JSON. */
function same(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Puts each changed value in the What-if session as the Account form does: an Account is tried as a unit (`tryAccount`), as a
 * Set of each changed field or, for a first volatility or fee, one Set of the whole Account; and the inflation is the Set
 * `economy.inflation` when the plan already states one. Nothing is written. The values are the document's: no figure is made here.
 */
export function tryValues(
	name: string,
	hash: string,
	stored: ScenarioDocument,
	next: ScenarioDocument,
): TriedValues {
	for (const account of next.accounts) {
		const before = stored.accounts.find((one) => one.id === account.id)
		if (before === undefined || same(before, account)) continue
		whatIfSession.tryAccount(name, hash, {
			stored: recordOf(before),
			edited: { ...recordOf(account), id: account.id },
		})
	}
	const inflation = next.economy?.inflation
	if (same(stored.economy, next.economy)) return { cleared: [], inflationUntried: false }
	if (stored.economy === undefined) return { cleared: [], inflationUntried: true }
	if (inflation === undefined) return { cleared: ["inflation"], inflationUntried: false }
	whatIfSession.tryChange(name, hash, (base) => withSet(base, "economy.inflation", inflation))
	return { cleared: [], inflationUntried: false }
}
