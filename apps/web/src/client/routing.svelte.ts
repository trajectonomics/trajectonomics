import { isCliError } from "../lib/edit/failure"
import {
	documentWith,
	flowIdsAfter,
	type RoutingChange,
	sessionWith,
} from "../lib/view/routing/change"
import type { RoutingPlan } from "../lib/view/routing/context"
import { documentPathOf, type Place, placeOf } from "../lib/view/routing/refusal"
import { failedReads } from "../lib/what-if/answer"
import { shownPlan } from "../lib/what-if/routing"
import { editSession } from "./edit.svelte.js"
import { whatIfSession } from "./what-if.svelte.js"

/** Who sent the Edit, so only the Where money goes page shows its refusal. */
export const SOURCE = "routing"

/** The page's saves and tries, and where the last refusal lands (web ADR 0022). */
class Routing {
	/** The ids of the Flows of the document the last save sent, in order, which a refusal's position in its path names. */
	sent = $state<string[]>([])
	private readonly failure = $derived(editSession.source === SOURCE ? editSession.failure : null)
	/**
	 * Whether this page's last Edit failed with words for a form. A write that landed and could not be read again
	 * has no error (its sentence is the page's notice, and stays until a read shows), and a refusal after one still
	 * lands here (web ADR 0008).
	 */
	private readonly ownError = $derived(
		editSession.source === SOURCE && (editSession.failure !== null || editSession.error !== null),
	)
	/** The message of a refusal or a failure to reach traj, as its source words it: the CLI's, or the server's own. */
	readonly message = $derived.by(() => {
		if (this.ownError) return editSession.failure?.message ?? editSession.error
		return this.refused !== null && placeOf(this.refused, this.sent) !== null
			? this.refused.message
			: null
	})
	/** Whether `message` is the CLI's own words, or the server's or the page's sentence about not reaching it. */
	readonly messageFromCli = $derived.by(() => {
		if (this.ownError) return isCliError(editSession.failure)
		return this.refused !== null && placeOf(this.refused, this.sent) !== null
	})
	/**
	 * The refusal the What-if session's own read states for a routing list it holds a Set of (`cashflow.*`): the CLI's error, whose
	 * `details.documentPath` names the row. Null while the session tries no routing list or its reads are well.
	 */
	private readonly refused = $derived.by(() => {
		const session = whatIfSession.whatIf
		const answer = whatIfSession.answer
		if (answer === null || session === null || !whatIfSession.active) return null
		if (!session.sets.some((set) => set.path.startsWith("cashflow."))) return null
		const named = failedReads(answer).find((one) => documentPathOf(one.error).length > 0)
		return named?.error ?? null
	})
	/** The row or transfer the last refusal names, from an Edit or from the session's try, or null when it names none. */
	readonly place = $derived<Place | null>(
		placeOf(this.failure, this.sent) ?? placeOf(this.refused, this.sent),
	)

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
		const tried = whatIfSession.tryChange(plan.name, plan.contentHash, (base) =>
			sessionWith(base, plan.doc, change),
		)
		// A refusal of the tried plan names a Flow by its position in the plan the session shows.
		if (tried) this.sent = shownPlan(plan.doc, whatIfSession.whatIf).flows.map((flow) => flow.id)
		return tried
	}

	/** Forgets the last refusal, so a drawer opened afterwards shows none of it. */
	clear(): void {
		editSession.clear()
	}
}

export const routing = new Routing()
