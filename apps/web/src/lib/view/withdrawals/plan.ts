/**
 * What a withdrawal form saves and tries: the document with the Flow put in, where the Flow sits for a refusal's
 * path, and the Flows a what-if would carry. Pure: the components call it and send the result.
 */
import type { ScenarioDocument, ScenarioFlow } from "../../contract"
import { sameJson } from "../../what-if/same-json"
import { recordOf } from "../../what-if/session-items"
import type { TriedFlow } from "../../what-if/try-flow"
import type { Problems } from "../plan-items/problems"
import { withdrawalFromDraft } from "./build"
import type { WithdrawalContext } from "./context"
import { stoppableExpenses } from "./context"
import { withdrawalDocument } from "./document"
import type { WithdrawalDraft } from "./draft"
import { layoutOf, type WithdrawalLayout } from "./refusal"

/** A draft made into the plan's next document, or the problems at its fields. */
export type Prepared =
	| { ok: true; document: ScenarioDocument; layout: WithdrawalLayout; flow: ScenarioFlow }
	| { ok: false; problems: Problems }

/** The plan's next document for a draft: the Flow, and the other expenses it stops, put in. */
export function prepareWithdrawal(
	draft: WithdrawalDraft,
	ctx: WithdrawalContext,
	existing: ScenarioFlow | undefined,
): Prepared {
	const taken = ctx.doc.flows.map((flow) => flow.id)
	const made = withdrawalFromDraft(draft, { existing, taken, asOf: ctx.asOf })
	if (!made.ok) return made
	const offered = stoppableExpenses(ctx, draft, made.flow.id).map((flow) => flow.id)
	const ticked = draft.stops.filter((id) => offered.includes(id))
	const document = withdrawalDocument(ctx.doc, made.flow, { offered, ticked })
	return { ok: true, document, flow: made.flow, layout: layoutOf(document, made.flow.id, ticked) }
}

/** The Flows of the next document that differ from the saved one, each beside its saved self. */
export function changedFlows(before: ScenarioDocument, after: ScenarioDocument): TriedFlow[] {
	return after.flows.flatMap((flow): TriedFlow[] => {
		const was = before.flows.find((one) => one.id === flow.id)
		const edited = { ...recordOf(flow), id: flow.id }
		const stored = was === undefined ? undefined : recordOf(was)
		return stored !== undefined && sameJson(stored, edited) ? [] : [{ stored, edited }]
	})
}
