import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ScenarioDocument } from "../../lib/contract"
import type { Json } from "../../lib/what-if/json"
import { shownAccount } from "../../lib/what-if/lens-document"
import { recordOf, withSet } from "../../lib/what-if/session"

/** Whether two values of a document are the same JSON. */
function same(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * The Account as it is tried: the one the session shows (the plan's own with the earlier tries put in) with only the fields the
 * person changed laid on top, so a new try carries the earlier ones as the Account form's does (`shownAccount`). A field the form
 * took out is taken out of it too, which `traj` takes as one Set of the whole Account.
 */
function triedAccount(
	view: ScenarioDocument["accounts"][number],
	stored: ScenarioDocument["accounts"][number],
	draft: ScenarioDocument["accounts"][number],
): Record<string, Json> & { id: string } {
	const before = recordOf(stored)
	const after = recordOf(draft)
	const edited: Record<string, Json> = recordOf(view)
	for (const field of Object.keys(before)) if (!(field in after)) delete edited[field]
	for (const [field, value] of Object.entries(after)) {
		if (!same(before[field], value)) edited[field] = value
	}
	return { ...edited, id: draft.id }
}

/**
 * Puts each changed value in the What-if session as the Account form does: an Account is tried as a unit (`tryAccount`), as a
 * Set of each changed field or, for a first volatility or fee, one Set of the whole Account; and a changed inflation is the Set
 * `economy.inflation`. Nothing is written. The values are the document's: no figure is made here.
 */
export function tryValues(
	name: string,
	hash: string,
	stored: ScenarioDocument,
	next: ScenarioDocument,
): void {
	for (const account of next.accounts) {
		const before = stored.accounts.find((one) => one.id === account.id)
		if (before === undefined || same(before, account)) continue
		const view = shownAccount(stored, whatIfSession.changesFor(name), account.id)
		if (view === undefined) continue
		whatIfSession.tryAccount(name, hash, {
			stored: recordOf(before),
			edited: triedAccount(view, before, account),
		})
	}
	const inflation = next.economy?.inflation
	if (inflation === undefined || same(stored.economy, next.economy)) return
	whatIfSession.tryChange(name, hash, (base) => withSet(base, "economy.inflation", inflation))
}
