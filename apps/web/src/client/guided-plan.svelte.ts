import { goto } from "$app/navigation"
import type { Snapshot } from "../lib/contract"
import { guidedEditOf } from "../lib/view/guided/compose"
import { withSearch } from "../lib/view/links"
import { editSession } from "./edit.svelte.js"
import { GuidedPlanState } from "./guided-plan-state.svelte.js"
import { currentSearch } from "./location.svelte.js"
import { withParam } from "./query-string.js"
import { selectPlan } from "./select-plan.svelte.js"

/** The guided first plan with its one Edit: Save, and the Reload a moved ledger asks for. */
class GuidedPlanSession extends GuidedPlanState {
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
			// A What-if pending on another plan keeps this page: the person settles it first, then saves again.
			if (!selectPlan(made.edit.name)) return
			const search = withParam(currentSearch(), "scenario", made.edit.name)
			this.cancel()
			await goto(withSearch("/", search))
			return
		}
		const failure = editSession.failure
		this.refusal = failure?.message ?? editSession.error ?? "The plan was not saved."
		this.hint = failure?.hint ?? null
		this.reloadable = failure?.code === "guided_ledger_changed"
		// A plan saved without its household is in the ledger already: read again so Plans lists it.
		if (failure?.code === "guided_plan_half_saved") await editSession.addPlan(made.edit.name)
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
