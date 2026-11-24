import {
	documentWith,
	flowIdsAfter,
	type RoutingChange,
	sessionWith,
} from "../lib/view/routing/change"
import type { RoutingPlan } from "../lib/view/routing/context"
import { type Place, placeOf } from "../lib/view/routing/refusal"
import { editSession } from "./edit.svelte.js"
import { whatIfSession } from "./what-if.svelte.js"

/** Who sent the Edit, so only the Where money goes page shows its refusal. */
export const SOURCE = "routing"

/** The page's saves and tries, and where the last refusal lands (web ADR 0021). */
class Routing {
	/** The ids of the Flows of the document the last save sent, in order, which a refusal's position in its path names. */
	sent = $state<string[]>([])
	private readonly failure = $derived(editSession.source === SOURCE ? editSession.failure : null)
	/** The message of a refusal or a failure to reach traj: the CLI's words, shown as they are. */
	readonly message = $derived(
		editSession.source === SOURCE ? (editSession.failure?.message ?? editSession.error) : null,
	)
	/** The row or transfer the last refusal names, or null when it names none. */
	readonly place = $derived<Place | null>(placeOf(this.failure, this.sent))

	/** Saves the change as one `apply-plan` Edit over the hash the page read. True when the Edit ran. */
	async save(plan: RoutingPlan, change: RoutingChange): Promise<boolean> {
		editSession.clear()
		this.sent = flowIdsAfter(plan.doc, change)
		return editSession.run(
			{
				kind: "apply-plan",
				name: plan.name,
				contentHash: plan.contentHash,
				document: documentWith(plan.doc, change),
			},
			SOURCE,
		)
	}

	/** Tries the change in the What-if session: nothing is written. True when it was tried. */
	tryIt(plan: RoutingPlan, change: RoutingChange): boolean {
		editSession.clear()
		return whatIfSession.tryChange(plan.name, plan.contentHash, (base) =>
			sessionWith(base, plan.doc, change),
		)
	}

	/** Forgets the last refusal, so a drawer opened afterwards shows none of it. */
	clear(): void {
		editSession.clear()
	}
}

export const routing = new Routing()
