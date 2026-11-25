import type { PlanAction } from "../lib/view/plans/edits"
import { editSession } from "./edit.svelte.js"

/** What the plan drawer is open on: a plan's action, or a new plan. */
export type PlanDrawerMode = Exclude<PlanAction, "main"> | "new"

/**
 * The plan drawer's state, shared by the plan switcher and the plans page: which form is open, and on which plan.
 * One drawer is mounted for the page, so both menus open the same form.
 */
class PlanEditor {
	mode = $state<PlanDrawerMode | null>(null)
	plan = $state("")

	/** Opens a form on a plan (a new plan has none), clearing what the last Edit said. */
	open(mode: PlanDrawerMode, plan = ""): void {
		editSession.clear()
		this.plan = plan
		this.mode = mode
	}

	close(): void {
		this.mode = null
		editSession.clear()
	}
}

/** The one plan editor of the page. */
export const planEditor = new PlanEditor()
