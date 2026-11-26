import type { ScenarioDocument, ScenarioFlow } from "../lib/contract"
import { type EmployerShare, employerIdOf, employerOf } from "../lib/view/plan-items/employer"
import { type EmployerDraft, employerDraftOf } from "../lib/view/plan-items/employer-draft"
import { employerStart } from "../lib/view/plan-items/flow-try-draft"
import type { FlowDraft, FlowKind } from "../lib/view/plan-items/flows"
import type { Problems } from "../lib/view/plan-items/problems"
import { salaryFromDraft, withoutSalary, withSalary } from "../lib/view/plan-items/salary-draft"
import { withTriedSalary } from "../lib/what-if/salary-try"
import { clearedFields, recordOf, triedItemSets } from "../lib/what-if/session"
import type { TriedFlow } from "../lib/what-if/try-flow"
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

/** Whether the employer section differs from the share the form started from. */
function shareChanged(starting: EmployerShare | null, draft: EmployerDraft): boolean {
	const from = employerDraftOf(starting)
	return (
		from.account !== draft.account || from.share !== draft.share || from.rounding !== draft.rounding
	)
}

/** The employer's Flow a salary try carries, or null: as the plan stores it (undefined for a share the session adds) and as the form made it. */
function employerTry(
	doc: ScenarioDocument,
	id: string,
	employer: ScenarioFlow | null,
): TriedFlow | null {
	if (employer === null) return null
	const stored = employerOf(doc.flows, id)
	return {
		stored: stored === null ? undefined : recordOf(stored.flow),
		edited: { ...recordOf(employer), id: employer.id },
	}
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
	// A what-if cannot clear a field, so a once value whose stored Flow has an end sends that end as its start: the CLI
	// accepts a once Flow that ends on its start, and refuses one that keeps an end from before the try (ONCE_FLOW_END_MISMATCH).
	const edited =
		result.flow.frequency === "once" && existing.end !== undefined
			? { ...result.flow, end: result.flow.start }
			: result.flow
	const stored = recordOf(existing)
	const made = recordOf(edited)
	const sets = triedItemSets("flows", existing.id, stored, made)
	const cleared = sets.some((set) => set.path === `flows.${existing.id}`)
		? []
		: clearedFields(stored, made)
	const starting = employerStart(doc, name, existing, whatIfSession.whatIf)
	// A try with no edit in either section leaves a switched-off Flow off: switching it on would be a change the person
	// did not make. A field the form cleared is no edit a what-if can make either, so it leaves the Flow off too, and the
	// notice says why. The employer section compares the form's draft with the share the form started from, because the
	// form's salary reads the stored dates while the salary is off, so a rebuilt share would differ on the dates alone.
	const off = whatIfSession.isOffIn(name, `flows.${existing.id}`)
	if (off && sets.length === 0 && !shareChanged(starting, input.employer))
		return { done: cleared.length === 0, problems: {}, cleared, sent: [] }
	const storedShare = employerOf(doc.flows, existing.id)
	const shareId = employerIdOf(existing.id)
	const ran = whatIfSession.tryChange(name, contentHash, (base) =>
		withTriedSalary(base, {
			id: existing.id,
			shareId,
			salary: { stored, edited: made },
			employer: employerTry(doc, existing.id, result.employer),
			dropped: result.dropped,
			added: storedShare === null ? `flows.${shareId}` : null,
		}),
	)
	return { done: cleared.length === 0 && ran, problems: {}, cleared, sent: [] }
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
