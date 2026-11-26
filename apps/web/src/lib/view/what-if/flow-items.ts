import type { HouseholdDocument, ScenarioDocument, ScenarioFlow } from "../../contract"
import { lensDocument } from "../../what-if/lens-document"
import { type ItemNames, NO_ITEM_NAMES } from "../item-names"
import { groupedIds } from "../plan-items/asset-document"
import { employerIdOf } from "../plan-items/employer"
import { type FlowCard, type FlowKind, flowCards } from "../plan-items/flows"
import type { PlanKind } from "../plan-items/kinds"
import { shownCards } from "./items"
import { marksFor } from "./marks"
import type { ItemsView, PlanChanges } from "./plan-changes"

const FLOW_FIELDS = ["amount", "frequency", "start", "end", "growth", "earned", "employer"] as const

/** The Flows the session adds, which a salary's employer share may be: no card is theirs, but a switch follows one. */
function addedFlows(changes: PlanChanges | null): ScenarioFlow[] {
	return (changes?.additions ?? []).flatMap((one) =>
		one.list === "flows" ? [one.item as unknown as ScenarioFlow] : [],
	)
}

/** A card sees the switch of a share the session adds, though its text stays the plan's own. */
function withAddedShare(card: FlowCard, shares: ReadonlySet<string>): FlowCard {
	const id = employerIdOf(card.id)
	return card.employerId === null && shares.has(id) ? { ...card, employerId: id } : card
}

/** A card keeps the plan's share id when a try cleared the share, so its switch still takes the salary and share together. */
function withStoredShare(card: FlowCard, baseline: readonly FlowCard[]): FlowCard {
	const stored = baseline.find((one) => one.id === card.id)
	return card.employerId === null && stored?.employerId != null
		? { ...card, employerId: stored.employerId }
		: card
}

/**
 * The Flow cards of a page as the what-if holds them, with the baseline's text of each changed field. The
 * Assets page lists no Flow, so its kind reads as income and its cards are not shown. A real asset's Flows are
 * on its card, so they are left out of the lists.
 */
export function flowItems(
	doc: ScenarioDocument,
	pageKind: PlanKind,
	household: HouseholdDocument | null,
	changes: PlanChanges | null,
	names: ItemNames = NO_ITEM_NAMES,
): ItemsView<FlowCard> {
	const kind: FlowKind = pageKind === "expense" ? "expense" : "income"
	const grouped = groupedIds(doc)
	const added = addedFlows(changes)
	const shares = new Set(added.map((flow) => flow.id))
	const listed = (flows: readonly ScenarioFlow[], all: readonly ScenarioFlow[]) =>
		flowCards(
			flows.filter((flow) => !grouped.has(flow.id)),
			kind,
			household,
			all,
			names,
		)
	const baseline = listed(doc.flows, doc.flows).map((card) => withAddedShare(card, shares))
	if (changes === null) return { cards: baseline, marks: {} }
	const whatIfFlows = [...lensDocument(doc, changes).flows, ...added]
	const whatIf = listed(whatIfFlows, whatIfFlows).map((card) => withStoredShare(card, baseline))
	return {
		cards: shownCards(baseline, whatIf),
		marks: marksFor(baseline, whatIf, "flows", changes, FLOW_FIELDS),
	}
}
