import { householdWithOwner } from "../lib/view/household/owner"
import { type SalaryResult, withSalary } from "../lib/view/plan-items/salary-draft"
import { withOwnerLabel } from "../lib/view/tax-settings/filer-label"
import { editSession } from "./edit.svelte.js"
import type { FlowSave, FlowSaved } from "./flow-save.js"
import { saveHousehold } from "./household-save.js"
import { currentSnapshot } from "./snapshot.svelte.js"

/**
 * Writes the Owner the Income form chose, after the Flow's own Edit: the Flow must be in the plan first, and the household
 * Edit names the `householdHash` of the Snapshot that Edit answered with, which covers the new document (cli ADR 0055).
 * False, with nothing sent, where that Snapshot was not read: the page then offers Reload, and the next Save writes it.
 */
async function saveFlowOwner(name: string, flowId: string, owner: string): Promise<boolean> {
	const state = currentSnapshot()
	if (editSession.savedUnread || state.status !== "ready") return false
	const read = state.snapshot.reads.documents[name]
	if (read?.ok !== true || read.data.scenario.household === null) return false
	const { household, householdHash } = read.data.scenario
	return saveHousehold(name, householdHash, householdWithOwner(household, flowId, owner))
}

/**
 * The Edit of a salary that passed the form's checks, then the Owner it changed. A stored label that names a person moves to
 * the new Owner in the same document, so the plan's tax reads the income as theirs.
 */
export async function applySalary(
	input: FlowSave,
	result: Extract<SalaryResult, { ok: true }>,
): Promise<FlowSaved> {
	const { name, contentHash, doc, existing, owner } = input
	const { id } = result.flow
	const document = withOwnerLabel(withSalary(doc, result), id, owner ?? "")
	const written = await editSession.run({ kind: "apply-plan", name, contentHash, document })
	const done = written && (owner === undefined || (await saveFlowOwner(name, id, owner)))
	const sent = document.flows.map((flow) => flow.id)
	const added = written && existing === undefined ? id : undefined
	return { done, problems: {}, cleared: [], sent, added }
}
