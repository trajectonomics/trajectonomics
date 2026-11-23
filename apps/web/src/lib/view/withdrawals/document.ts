/** The plan's document with the withdrawal put in, and the other expenses it stops (cli ADR 0063). Pure. */
import type { ScenarioDocument, ScenarioFlow } from "../../contract/scenario-show"
import { upsert } from "../plan-items/document"

/** The Flow without its `endAt`. */
function withoutEnd(flow: ScenarioFlow): ScenarioFlow {
	const { endAt, ...rest } = flow
	return rest
}

/**
 * The document with the Flow saved. When the rule starts at a Milestone, each expense in `offered` that the form
 * ticked (`ticked`) ends at that Milestone (`endAt`), and each one the form listed that it did not tick has any
 * `endAt` of that Milestone taken off, so unticking takes the stop back. Expenses not offered are never touched.
 */
export function withdrawalDocument(
	doc: ScenarioDocument,
	flow: ScenarioFlow,
	stops: { offered: readonly string[]; ticked: readonly string[] },
): ScenarioDocument {
	const milestone = flow.startAt
	const flows = upsert(doc.flows, flow).map((one): ScenarioFlow => {
		if (milestone === undefined || one.id === flow.id || !stops.offered.includes(one.id)) return one
		if (stops.ticked.includes(one.id)) return { ...one, endAt: milestone }
		return one.endAt === milestone ? withoutEnd(one) : one
	})
	return { ...doc, flows }
}
