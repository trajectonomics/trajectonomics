import type { ScenarioFlow } from "../../contract/scenario-show"
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
