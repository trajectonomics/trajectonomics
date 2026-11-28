import type { ProjectionChance, ProjectionRun } from "../../contract"
import { formatMonth, yearOf } from "../../format"
import { type ItemNames, itemLabel, NO_ITEM_NAMES } from "../item-names"
import { dateShare } from "./focus-axis"
import { milestoneView } from "./milestones"

/** One pin on the Milestones timeline. */
export interface MilestoneFocusPin {
	readonly key: string
	/** Its place on the line, from 0 to 1, placed for drawing only. */
	readonly x: number
	/** True for the one pin the answer is: the next reached milestone. */
	readonly next: boolean
	readonly unreached: boolean
}

/** The Milestones page's focus point: the next milestone on a timeline from the As-of to the Horizon. */
export interface MilestoneFocus {
	/** The question and the answer, for the sr-only heading. */
	readonly label: string
	readonly tone: "plain" | "warn"
	/** The next reached milestone's month, the display answer; null when none is ahead. */
	readonly month: string | null
	/** The first unreached milestone, whose name is the answer when none is ahead. */
	readonly unreachedId: string | null
	/** The next reached milestone, whose name sits above its pin. */
	readonly nextId: string | null
	/** "not by Mar 2041", under the answer, or null. */
	readonly mark: string | null
	readonly pins: readonly MilestoneFocusPin[]
	readonly startYear: string
	readonly endYear: string
}

/** The age the chance read states at a milestone, from its median path; null when it states none. */
function ageAt(chance: ProjectionChance | null, id: string): number | null {
	const one = chance?.milestones?.find((milestone) => milestone.id === id)
	return one?.dates?.p50?.ages[0]?.age ?? null
}

/**
 * The focus point of one projection's milestones. The next is the first reached milestone on or after the
 * As-of; without one, the first unreached milestone's name is the answer. Null when the plan declares no
 * milestone, which is the page's own empty state. Every date is the CLI's string.
 */
export function milestoneFocusView(
	run: ProjectionRun,
	asOf: string,
	chance: ProjectionChance | null,
	names: ItemNames = NO_ITEM_NAMES,
): MilestoneFocus | null {
	const view = milestoneView(run)
	if (view === null) return null
	const ahead = view.reached.filter((one) => one.date >= asOf)
	const next = ahead[0]
	const unreached = view.unreached[0]
	const pins: MilestoneFocusPin[] = [
		...ahead.map((one) => ({
			key: one.id,
			x: dateShare(asOf, run.horizon, one.date),
			next: one.id === next?.id,
			unreached: false,
		})),
		...view.unreached.map((one) => ({
			key: one.id,
			x: dateShare(asOf, run.horizon, one.notReachedBy),
			next: false,
			unreached: true,
		})),
	]
	const ends = { pins, startYear: yearOf(asOf), endYear: yearOf(run.horizon) }
	if (next !== undefined) {
		const name = itemLabel(names, "milestone", next.id).text
		const month = formatMonth(next.date)
		const age = ageAt(chance, next.id)
		return {
			label: `What's next? ${name} in ${month}.${age === null ? "" : ` At ${age}.`}`,
			tone: "plain",
			month,
			unreachedId: null,
			nextId: next.id,
			mark: null,
			...ends,
		}
	}
	if (unreached === undefined) return null
	const name = itemLabel(names, "milestone", unreached.id).text
	const by = formatMonth(unreached.notReachedBy)
	return {
		label: `What's next? ${name} not by ${by}.`,
		tone: "warn",
		month: null,
		unreachedId: unreached.id,
		nextId: null,
		mark: `not by ${by}`,
		...ends,
	}
}
