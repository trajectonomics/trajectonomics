import { goto } from "$app/navigation"
import type { Snapshot } from "../lib/contract"
import { guidedEditOf } from "../lib/view/guided/compose"
import { withSearch } from "../lib/view/links"
import { firstTaxLabelOffer } from "../lib/view/plan-items/tax-label"
import { editSession } from "./edit.svelte.js"
import { GuidedPlanState } from "./guided-plan-state.svelte.js"
import { currentSearch } from "./location.svelte.js"
import { withParam } from "./query-string.js"
import { selectPlan } from "./select-plan.svelte.js"
import { currentSnapshot } from "./snapshot.svelte.js"
import { taxLabelNotice } from "./tax-label-notice.svelte.js"

/** The guided first plan with its one Edit: Save, and the Reload a moved ledger asks for. */
class GuidedPlanSession extends GuidedPlanState {
	/** The plan a Save wrote while a What-if held the page: the page says so until the plan is opened. */
	saved = $state<string | null>(null)

	/** Cancel forgets the sentence too. */
	override cancel(): void {
		super.cancel()
		this.saved = null
	}

	/** Saves the one Edit, selects the plan it made and opens Home; a refusal stays above Save. */
	async save(snapshot: Snapshot): Promise<void> {
		const made = guidedEditOf(this.draftOf(snapshot), snapshot.params.asOf)
		if (!made.ok) {
			this.refusal = made.problem
			this.hint = null
			this.reloadable = false
			this.showProblems = true
			return
		}
		this.refusal = null
		this.hint = null
		this.reloadable = false
		if (await editSession.run(made.edit)) {
			this.offerTaxLabel(made.edit.name)
			if (selectPlan(made.edit.name)) {
				const search = withParam(currentSearch(), "scenario", made.edit.name)
				this.cancel()
				await goto(withSearch("/", search))
				return
			}
			// The plan is in the ledger, but a What-if on another plan refuses the switch. Say it saved, and keep the
			// page on a sentence that opens it once the What-if is settled.
			this.cancel()
			this.step = "stop"
			this.saved = made.edit.name
			return
		}
		const failure = editSession.failure
		this.refusal = failure?.message ?? editSession.error ?? "The plan was not saved."
		this.hint = failure?.hint ?? null
		this.reloadable = failure?.code === "guided_ledger_changed"
		// A plan saved without its household is in the ledger already: read again so Plans lists it.
		if (failure?.code === "guided_plan_half_saved") await editSession.addPlan(made.edit.name)
	}

	/** Offers the Tax labels link for the plan a Save made, when its income still has no label. */
	private offerTaxLabel(plan: string): void {
		taxLabelNotice.clear()
		const state = currentSnapshot()
		if (state.status !== "ready") return
		const offer = firstTaxLabelOffer(state.snapshot, plan)
		if (offer !== null) taxLabelNotice.offer(offer)
	}

	/** Opens the plan a Save wrote while a What-if held the page, once the What-if is settled. */
	async openSaved(): Promise<void> {
		const name = this.saved
		if (name === null || !selectPlan(name)) return
		const search = withParam(currentSearch(), "scenario", name)
		this.cancel()
		await goto(withSearch("/", search))
	}

	/** Reads the Snapshot again and keeps every answer, then walks the money again; a failed read keeps the page. */
	async reload(): Promise<void> {
		if (!(await editSession.reread())) {
			this.refusal = null
			this.hint = null
			return
		}
		this.refusal = null
		this.hint = null
		this.reloadable = false
		this.step = "money"
	}
}

/** The one guided plan of the page. */
export const guidedSession = new GuidedPlanSession()
