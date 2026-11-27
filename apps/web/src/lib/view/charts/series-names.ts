import type { ProjectionRun } from "../../contract"
import { type ItemNames, NO_ITEM_NAMES } from "../item-names"
import { annualFigures } from "./resolve-annual"
import { accountFigures, cashflowFigures } from "./resolve-flows"
import { retirementFigures, taxFigures } from "./resolve-later"
import { apart, distinctNames } from "./series-apart"
import type { Resolved } from "./types"

export { seriesLabelId, seriesWords } from "./series-ids"

/** Every yearly series a run states, by id, before names are told apart. */
export function rawSeries(run: ProjectionRun, names: ItemNames = NO_ITEM_NAMES): Resolved[] {
	return [
		...annualFigures(run),
		...accountFigures(run, names),
		...cashflowFigures(run, names),
		...taxFigures(run),
		...retirementFigures(run),
	]
}

/** The one id → name map: the selected plan keeps its chart names, and every other series has one name, in any run order. */
export function seriesNames(
	runs: readonly ProjectionRun[],
	selected: ProjectionRun | null,
	names: ItemNames,
	base: ReadonlyMap<string, string> = new Map(),
): ReadonlyMap<string, string> {
	const known = new Map<string, { id: string; name: string; fixed: boolean }>()
	for (const [id, name] of base) known.set(id, { id, name, fixed: true })
	for (const series of runs.flatMap((run) => rawSeries(run, names)))
		if (!known.has(series.id))
			known.set(series.id, { id: series.id, name: series.name, fixed: false })
	for (const series of selected === null
		? []
		: distinctNames(rawSeries(selected, names), names.accounts))
		known.set(series.id, { id: series.id, name: series.name, fixed: true })
	const fixed = new Set([...known.values()].flatMap((item) => (item.fixed ? [item.id] : [])))
	return new Map(
		apart([...known.values()], fixed, names.accounts).map((item) => [item.id, item.name]),
	)
}
