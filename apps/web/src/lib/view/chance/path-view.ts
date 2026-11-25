import { dayPosition, type LineMarker } from "../../chart"
import type { ProjectionChance, ProjectionPath } from "../../contract"
import { formatMonth } from "../../format"
import { type ItemNames, NO_ITEM_NAMES } from "../item-names"
import { milestoneMarkers } from "../milestones/milestones"
import { annualRowsOf } from "../projection/annual"
import { RUN_OUT_LABEL } from "./path-rows"
import { lowestWhen, pathTitle } from "./path-words"

/** How a future ended, from its own read: when it ran out and what it could not pay, or that it lasted to the Horizon. */
export interface Ending {
	readonly ranOut: string | null
	/** The shortfall the CLI states on the run-out date, or null when it lasted. */
	readonly unmet: string | null
	readonly horizon: string
}

/** What the CLI stated of a path in the chance's `outcomes`, when the Snapshot lists them. */
export interface Lowest {
	readonly amount: string
	/** The year it was lowest in, in the table's own terms: "in the year ending Oct 2052". */
	readonly when: string
	/** That roll-up's first day, as the CLI states it: the year row it marks in the table. */
	readonly day: string
}

/** The header of a path page. */
export interface PathHeader {
	readonly title: string
	readonly ending: Ending
	readonly closing: string | null
	readonly lowest: Lowest | null
}

/** The path's header: its title, how it ended, and the figures the chance's outcomes state of it. */
export function pathHeaderOf(path: ProjectionPath, chance: ProjectionChance): PathHeader {
	const outcome = chance.outcomes?.find((entry) => entry.index === path.index)
	return {
		title: pathTitle(path.index, path.definition.paths),
		ending: {
			ranOut: path.runsOut === null ? null : formatMonth(path.runsOut.date),
			unmet: path.runsOut === null ? null : path.runsOut.unmet,
			horizon: path.horizon,
		},
		closing: outcome?.closingNetWorth ?? null,
		lowest:
			outcome === undefined
				? null
				: {
						amount: outcome.lowestNetWorth,
						when: lowestWhen(path, outcome.lowestYear),
						day: outcome.lowestYear,
					},
	}
}

/**
 * The marks on the chart: each reached Milestone as the Projection page draws it, and the run-out as a rule where the
 * money ran out. A date outside every year row is not drawn; the header still says it.
 */
export function pathMarkers(path: ProjectionPath, names: ItemNames = NO_ITEM_NAMES): LineMarker[] {
	const markers = milestoneMarkers(path, names)
	if (path.runsOut === null) return markers
	const x = dayPosition(annualRowsOf(path), path.runsOut.date)
	return x === null ? markers : [...markers, { x, label: RUN_OUT_LABEL }]
}
