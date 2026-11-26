import type { ScenarioDocument } from "../../contract"
import type { ScenarioFlow } from "../../contract/scenario-show"
import { shownFlows } from "../../what-if/routing"
import type { WhatIf } from "../../what-if/session"
import { employerOf } from "./employer"
import { type EmployerDraft, employerDraftOf } from "./employer-draft"
import { type FlowDraft, flowDraftOf } from "./flows"

/**
 * The draft a try starts from. A once Flow's stored end is `end = start` only so `traj` accepts it, so the draft reads the
 * stored end back: switching the Flow to monthly must not keep the once start as its end.
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
		employer: employerDraftOf(existing === undefined ? null : employerOf(flows, existing.id)),
	}
}
