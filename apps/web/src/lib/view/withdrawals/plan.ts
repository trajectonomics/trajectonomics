/**
 * What a withdrawal form saves and tries: the document with the Flow put in, where the Flow sits for a refusal's
 * path, and the Flows a what-if would carry. Pure: the components call it and send the result.
 */
import type { HouseholdDocument, ScenarioDocument, ScenarioFlow } from "../../contract"
import { sameJson } from "../../what-if/same-json"
import { recordOf } from "../../what-if/session-items"
import type { TriedFlow } from "../../what-if/try-flow"
import { flowAnchorLabels } from "../household/model"
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

/**
 * The note that refuses a try, or null: the household pins a date of the Flow (its start or end) and the edited
 * Flow has none. A what-if would run without the date, while saving the plan fills it back in from the household.
 */
export function anchorRefusal(
	household: HouseholdDocument | null,
	tried: TriedFlow,
): string | null {
	const labels = flowAnchorLabels(household, tried.edited.id)
	for (const edge of ["start", "end"] as const) {
		const label = labels[edge]
		if (label !== null && tried.edited[edge] === undefined) {
			return `Your household sets when ${tried.edited.id} ${edge === "start" ? "starts" : "ends"} (${label}), and this change leaves that date out. Save it to have the household fill the date in, or keep a ${edge} date in the form.`
		}
	}
	return null
}

/** The Flows a try carries, or the first note that refuses it: nothing is tried when any Flow is refused. */
export function triedFlows(
	before: ScenarioDocument,
	after: ScenarioDocument,
	household: HouseholdDocument | null,
): { ok: true; flows: TriedFlow[] } | { ok: false; note: string } {
	const flows = changedFlows(before, after)
	for (const one of flows) {
		const note = anchorRefusal(household, one)
		if (note !== null) return { ok: false, note }
	}
	return { ok: true, flows }
}
