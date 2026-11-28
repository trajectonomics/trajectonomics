import { isCliError } from "../lib/edit/failure"
import { actionSource, isActionSource } from "../lib/view/action-source"
import {
	documentWith,
	flowIdsAfter,
	type RoutingChange,
	sessionWith,
} from "../lib/view/routing/change"
import type { RoutingContext, RoutingPlan } from "../lib/view/routing/context"
import type { ListName } from "../lib/view/routing/entries"
import { documentPathOf, type Place, placeOf } from "../lib/view/routing/refusal"
import { drawsPlace } from "../lib/view/routing/shown"
import { failedReads } from "../lib/what-if/answer"
import { shownPlan } from "../lib/what-if/routing"
import { editSession } from "./edit.svelte.js"
import { whatIfSession } from "./what-if.svelte.js"

/** Who sent a drawer's Edit, so only the Where money goes page shows its refusal. */
export const SOURCE = "routing"

/** The source of Done, or a drop, on one list: both save the order, and the refusal shows beside Done. */
export const orderSource = (list: ListName) => actionSource(SOURCE, "order", list)

/** The source of one row's Remove: a list entry by its position, or a move by its id. */
export const removeSource = (list: ListName | "flows", row: number | string) =>
	actionSource(SOURCE, "remove", list, String(row))

/** Whether this page sent the last request, from a drawer or from an inline action. */
const ofPage = (source: string) =>
	source === SOURCE || source.startsWith(`${actionSource(SOURCE)}:`)

/** The page's saves and tries, and where the last refusal lands (web ADR 0022). */
class Routing {
	/** The ids of the Flows of the document the last save sent, in order, which a refusal's position in its path names. */
	sent = $state<string[]>([])
	private readonly failure = $derived(ofPage(editSession.source) ? editSession.failure : null)
	/**
	 * Whether this page's last Edit failed with words for a form. A write that landed and could not be read again
	 * has no error (its sentence is the page's notice, and stays until a read shows), and a refusal after one still
	 * lands here (web ADR 0008).
	 */
	private readonly ownError = $derived(
		ofPage(editSession.source) && (editSession.failure !== null || editSession.error !== null),
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
	/** The row or transfer `message` names, from an Edit or from the session's try, or null when it names none. */
	readonly place = $derived.by<Place | null>(() =>
		placeOf(this.ownError ? this.failure : this.refused, this.sent),
	)
	/** What a drawer's form shows: `message`, but nothing of an inline action's refusal, which shows beside its control. */
	readonly formMessage = $derived(
		isActionSource(editSession.source) && this.ownError ? null : this.message,
	)

	/** Whether a row the page draws names the last Edit's refusal, so the control that sent it does not repeat it. */
	onRow(ctx: RoutingContext): boolean {
		return drawsPlace(placeOf(this.failure, this.sent), ctx)
	}

	/** Saves the change as one `apply-plan` Edit over the hash the page read. True when the Edit ran. */
	async save(plan: RoutingPlan, change: RoutingChange, source = SOURCE): Promise<boolean> {
		editSession.clear()
		this.sent = flowIdsAfter(plan.doc, change)
		return editSession.run(
			{
				kind: "apply-plan",
				name: plan.name,
				contentHash: plan.contentHash,
				document: documentWith(plan.doc, change),
			},
			source,
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
