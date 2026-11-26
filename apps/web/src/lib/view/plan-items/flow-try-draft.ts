import type { ScenarioDocument } from "../../contract"
import type { ScenarioFlow } from "../../contract/scenario-show"
import { shownFlows } from "../../what-if/routing"
import { groupId, groupOf, isOff, type WhatIf } from "../../what-if/session"
import { type EmployerShare, employerIdOf, employerOf } from "./employer"
import { type EmployerDraft, employerDraftOf } from "./employer-draft"
import { type FlowDraft, flowDraftOf } from "./flows"

/**
 * The draft a try starts from. A once Flow's stored end is `end = start` only so `traj` accepts it, so the draft reads the
 * stored end back: switching the Flow to monthly must not keep the once start as its end.
 *
 * A Flow switched off in the session is not in `flows`: `traj` refuses a Set of a Flow a Removal took out, so its try is
 * held back (`overridesOf`) until the Flow switches on. The draft is the stored Flow's own values, a try submitted with
 * no edits leaves it off, and an edited one switches it on and sends the edit.
 */
export function flowDraftForTry(
	flows: readonly ScenarioFlow[],
	id: string | undefined,
	stored: ScenarioFlow | undefined,
): FlowDraft {
	const shown = flows.find((flow) => flow.id === id)
	const draft = flowDraftOf(shown ?? stored)
	return shown?.frequency === "once" ? { ...draft, end: stored?.end ?? "" } : draft
}

/**
 * The employer share a try's form starts from: as the session shows it, or, while the salary is off, the stored share
 * or the share the session added, because the session then holds the share out of what it shows. A share a try cleared before the switch stays cleared:
 * its Removal is the switch's to keep, so the form must not fall back to the stored share.
 */
export function employerStart(
	doc: ScenarioDocument,
	name: string,
	existing: ScenarioFlow | undefined,
	whatIf: WhatIf | null,
): EmployerShare | null {
	if (existing === undefined) return null
	const session = whatIf !== null && whatIf.plan === name ? whatIf : null
	const share =
		session === null
			? employerOf(doc.flows, existing.id)
			: employerOf(shownFlows(doc, session, name), existing.id)
	if (session === null || !isOff(session, `flows.${existing.id}`)) return share
	const group = groupOf(session, groupId({ kind: "salary", name: existing.id }))
	if (group?.held.includes(`flows.${employerIdOf(existing.id)}`) === true) return null
	const added = session.additions.filter((one) => one.list === "flows").map((one) => one.item)
	return (
		employerOf(doc.flows, existing.id) ??
		employerOf(added as unknown as ScenarioFlow[], existing.id)
	)
}

/** What a Flow form starts from: the draft and the employer section, as the session shows the plan when it tries a value. */
export function flowFormStart(
	doc: ScenarioDocument,
	name: string,
	existing: ScenarioFlow | undefined,
	tryValue: boolean,
	whatIf: WhatIf | null,
): { draft: FlowDraft; employer: EmployerDraft } {
	// The plan's Flows as the form starts from them: as the session shows them, added Flows too, so a new try carries the earlier ones.
	const flows = tryValue ? shownFlows(doc, whatIf, name) : doc.flows
	return {
		draft: flowDraftForTry(flows, existing?.id, existing),
		// What the employer adds on top of a salary: nothing until the person fills it in.
		employer: employerDraftOf(employerStart(doc, name, existing, tryValue ? whatIf : null)),
	}
}
