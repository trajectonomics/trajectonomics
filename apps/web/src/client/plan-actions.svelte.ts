import { renameEdit } from "../lib/view/plans/edits"
import type { PlanRow } from "../lib/view/plans/rows"
import { editSession } from "./edit.svelte.js"
import { selectPlan } from "./select-plan.svelte.js"
import { whatIfSession } from "./what-if.svelte.js"

/**
 * Renames a plan. `follow` says whether the pages show it, and the caller reads it before this runs: once the Edit has
 * run the Snapshot no longer holds the old name, so it cannot be asked afterwards. When it did, the What-if session
 * and the address bar follow the plan to its new name. Returns true when the Edit ran.
 */
export async function renamePlan(row: PlanRow, newName: string, follow: boolean): Promise<boolean> {
	const from = row.name
	const to = newName.trim()
	if (!(await editSession.run(renameEdit(row, newName)))) return false
	whatIfSession.followRename(from, to)
	if (follow) selectPlan(to)
	return true
}

/**
 * Deletes a plan. When the pages showed it (`follow`, read by the caller before this runs), the first plan left is
 * shown. Returns true when the Edit ran.
 */
export async function deletePlan(
	name: string,
	names: readonly string[],
	follow: boolean,
): Promise<boolean> {
	const left = names.filter((one) => one !== name)
	if (!(await editSession.run({ kind: "delete-plan", name }))) return false
	if (follow) selectPlan(left[0] ?? "")
	return true
}
