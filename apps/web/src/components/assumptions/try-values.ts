import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ScenarioDocument } from "../../lib/contract"
import { recordOf, withSet } from "../../lib/what-if/session"

/** What a try could not put in the session, by value, so the form says it beside the ones it did. */
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
 * Puts each changed value in the What-if session as a Set: an Account's return and volatility as `accounts.<id>.<field>` (a
 * volatility the plan does not hold is added by the CLI, cli ADR 0068), and the inflation as `economy.inflation` when the plan
 * already states one. Nothing is written. The values are the document's, so no figure is made here.
 */
export function tryValues(
	name: string,
	hash: string,
	stored: ScenarioDocument,
	next: ScenarioDocument,
): TriedValues {
	const cleared: string[] = []
	for (const account of next.accounts) {
		const before = stored.accounts.find((one) => one.id === account.id)
		if (before === undefined || same(before, account)) continue
		const gone = whatIfSession.tryItem(
			name,
			hash,
			"accounts",
			account.id,
			recordOf(before),
			recordOf(account),
		)
		cleared.push(...gone.map((field) => `${account.id} ${field}`))
	}
	const inflation = next.economy?.inflation
	if (same(stored.economy, next.economy)) return { cleared, inflationUntried: false }
	if (stored.economy === undefined) return { cleared, inflationUntried: true }
	if (inflation === undefined)
		return { cleared: [...cleared, "inflation"], inflationUntried: false }
	whatIfSession.tryChange(name, hash, (base) => withSet(base, "economy.inflation", inflation))
	return { cleared, inflationUntried: false }
}
