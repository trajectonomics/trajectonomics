import type { ProjectionCompare } from "../../contract"
import { formatDate } from "../../format"
import { type Cell, textCell } from "../compare/cell"
import { type ItemNames, itemText, NO_ITEM_NAMES } from "../item-names"
import { countChange } from "./change"
import type { Triple } from "./triple"

type Row = NonNullable<ProjectionCompare["sides"]["a"]["milestones"]>[number]

const EARLIER_LATER = ["earlier", "later"] as const

/** A side's date for a Milestone: the CLI's date, the words for one it does not reach, or that the plan has none. */
function dateCell(rows: readonly Row[] | undefined, id: string): Cell {
	const row = rows?.find((candidate) => candidate.id === id)
	if (row === undefined) return textCell("Not in this plan")
	return row.date === null ? textCell("Not reached") : textCell(formatDate(row.date))
}

/** Whether a side reaches a Milestone: it declares it and the CLI gave it a date. */
function reached(rows: readonly Row[] | undefined, id: string): boolean {
	const row = rows?.find((candidate) => candidate.id === id)
	return row !== undefined && row.date !== null
}

/** Why a Milestone has no change: only one side declares it, or one side or neither reaches it. */
function noChangeReason(data: ProjectionCompare, id: string, declared: boolean): string {
	if (!declared) return "Only one side declares it"
	const { a, b } = data.sides
	return reached(a.milestones, id) || reached(b.milestones, id)
		? "One side does not reach it"
		: "Neither side reaches it"
}

/** The ids of both sides' Milestones: the baseline's in its Scenario order, then any only the what-if declares. */
function idsOf(data: ProjectionCompare): readonly string[] {
	const ids = (data.sides.a.milestones ?? []).map((row) => row.id)
	for (const row of data.sides.b.milestones ?? []) if (!ids.includes(row.id)) ids.push(row.id)
	return ids
}

/**
 * Each Milestone's what-if date, its baseline date and the CLI's `months` between them
 * (`deltas.milestones`). A Milestone reached on one side only reads "Not reached" on the other and has no
 * change, because `months` is null there. Empty when neither side declares a Milestone. Each label is the plan's name for it,
 * or its id when the document states none (web ADR 0029).
 */
export function milestoneTriples(
	data: ProjectionCompare,
	names: ItemNames = NO_ITEM_NAMES,
): readonly Triple[] {
	const { a, b } = data.sides
	return idsOf(data).map((id) => {
		const delta = data.deltas.milestones?.find((row) => row.id === id)
		return {
			key: id,
			label: itemText(names, "milestone", id),
			whatIf: dateCell(b.milestones, id),
			baseline: dateCell(a.milestones, id),
			change: countChange(
				delta?.months,
				"month",
				EARLIER_LATER,
				noChangeReason(data, id, delta !== undefined),
			),
		}
	})
}
