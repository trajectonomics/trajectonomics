import type { ScenarioDocument, ScenarioFlow } from "../lib/contract"
import { employerOf } from "../lib/view/plan-items/employer"
import type { EmployerDraft } from "../lib/view/plan-items/employer-draft"
import type { FlowDraft, FlowKind } from "../lib/view/plan-items/flows"
import type { Problems } from "../lib/view/plan-items/problems"
import {
	type SalaryResult,
	salaryFromDraft,
	withoutSalary,
	withSalary,
} from "../lib/view/plan-items/salary-draft"
import { recordOf } from "../lib/what-if/session"
import { editSession } from "./edit.svelte.js"
import { whatIfSession } from "./what-if.svelte.js"

/** What a Flow form hands to its save: the plan, what the form holds, and whether the value is tried and not saved. */
export interface FlowSave {
	name: string
	contentHash: string
	doc: ScenarioDocument
	kind: FlowKind
	existing: ScenarioFlow | undefined
	draft: FlowDraft
	employer: EmployerDraft
	tryValue: boolean
}

/**
 * What the form shows after a save: whether it is done, the problems at its fields, the fields a tried value cleared, and the ids of
 * the Flows of the document the Edit sent, in order, which name the position a refusal's path holds.
 */
export interface FlowSaved {
	done: boolean
	problems: Problems
	cleared: string[]
	sent: string[]
}

/** Tries the employer's Flow beside the salary: a new one is an Addition, an edited one a Set, a cleared one is switched off. */
function tryEmployer(input: FlowSave, result: Extract<SalaryResult, { ok: true }>): void {
	const { name, contentHash, doc, existing } = input
	const stored = existing === undefined ? null : employerOf(doc.flows, existing.id)
	if (result.employer !== null) {
		whatIfSession.tryFlow(name, contentHash, {
			stored: stored === null ? undefined : recordOf(stored.flow),
			edited: { ...recordOf(result.employer), id: result.employer.id },
		})
	}
	if (result.dropped !== null)
		whatIfSession.setOff(name, contentHash, `flows.${result.dropped}`, true)
}

/**
 * Saves a Flow form. A salary and what its employer adds are one `apply-plan` Edit naming the hash the page read (web ADR 0017),
 * and a tried value is a Set of each changed field of both in the What-if session. The problems are the form's own shape checks.
 */
export async function saveFlow(input: FlowSave): Promise<FlowSaved> {
	const { name, contentHash, doc, existing } = input
	const result = salaryFromDraft(input.draft, input.employer, { kind: input.kind, existing, doc })
	if (!result.ok) {
		editSession.clear()
		return { done: false, problems: result.problems, cleared: [], sent: [] }
	}
	if (!input.tryValue) {
		const document = withSalary(doc, result)
		const done = await editSession.run({ kind: "apply-plan", name, contentHash, document })
		return { done, problems: {}, cleared: [], sent: document.flows.map((flow) => flow.id) }
	}
	if (existing === undefined) return { done: true, problems: {}, cleared: [], sent: [] }
	const cleared = whatIfSession.tryItem(
		name,
		contentHash,
		"flows",
		existing.id,
		recordOf(existing),
		recordOf(result.flow),
	)
	tryEmployer(input, result)
	return { done: cleared.length === 0, problems: {}, cleared, sent: [] }
}

/** Deletes a Flow, and the employer's Flow it carries, as one Edit. True when it ran. */
export async function deleteFlow(
	input: { name: string; contentHash: string; doc: ScenarioDocument },
	id: string,
): Promise<boolean> {
	const { name, contentHash, doc } = input
	return editSession.run({
		kind: "apply-plan",
		name,
		contentHash,
		document: withoutSalary(doc, id),
	})
}
