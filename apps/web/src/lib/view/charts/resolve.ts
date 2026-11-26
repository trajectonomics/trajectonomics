import type { ProjectionRun } from "../../contract"
import { type ItemNames, NO_ITEM_NAMES } from "../item-names"
import { distinctNames, rawSeries } from "./series-names"
import type { Resolved } from "./types"

/**
 * Every yearly series a projection states, by id. The ids are the same on every plan, so a chart works
 * on all of them. Each point carries the CLI's own string and the period it covers; nothing here adds,
 * subtracts or divides money. Two series that would read alike take their item's id (web ADR 0029).
 */
export function resolveSeries(run: ProjectionRun, names: ItemNames = NO_ITEM_NAMES): Resolved[] {
	return distinctNames(rawSeries(run, names))
}

/** Every series of one run by id. */
export function seriesById(run: ProjectionRun, names: ItemNames): ReadonlyMap<string, Resolved> {
	return new Map(resolveSeries(run, names).map((item) => [item.id, item]))
}
