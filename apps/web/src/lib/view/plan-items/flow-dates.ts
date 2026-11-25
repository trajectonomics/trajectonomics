import type { HouseholdDocument } from "../../contract"
import type { ScenarioFlow } from "../../contract/scenario-show"
import { flowAnchorLabels } from "../household/model"
import { type ItemNames, itemText, NO_ITEM_NAMES } from "../item-names"

/** Whether a Flow is once: one occurrence on its start date, so it has no end. */
export function isOnce(flow: ScenarioFlow): boolean {
	return flow.frequency === "once"
}

/** The words for a date a Milestone sets: the plan's name for it, or the id when it states none. A Flow with none shows its own date. */
function dateWords(milestone: string | undefined, date: string, names: ItemNames): string {
	return milestone === undefined ? date : `When ${itemText(names, "milestone", milestone)} fires`
}

/** The anchor labels of one Flow's dates, as the card holds them. A once Flow has no end to label. */
function anchorsOf(household: HouseholdDocument | null, id: string, once: boolean) {
	const labels = flowAnchorLabels(household, id)
	return { startAnchor: labels.start, endAnchor: once ? null : labels.end }
}

/** The dates of one Flow's card. A once Flow reads "On" its one date and has no end; any other reads "Starts" and "Ends". */
export function datesOfCard(
	flow: ScenarioFlow,
	household: HouseholdDocument | null,
	names: ItemNames = NO_ITEM_NAMES,
) {
	const once = isOnce(flow)
	const labels = anchorsOf(household, flow.id, once)
	return {
		startLabel: once ? "On" : "Starts",
		// A Milestone date wins: `start` is then only where recurrence counts from (sim ADR 0012), not when the Flow begins.
		start: dateWords(flow.startAt, flow.start, names),
		end: once ? null : dateWords(flow.endAt, flow.end ?? "To the horizon", names),
		...labels,
	}
}
