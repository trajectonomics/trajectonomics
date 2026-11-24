import type { ProjectionRun } from "../../contract"
import { annualFigures } from "./resolve-annual"
import { accountFigures, cashflowFigures } from "./resolve-flows"
import { retirementFigures, taxFigures } from "./resolve-later"
import type { Resolved } from "./types"

/**
 * Every yearly series a projection states, by id. The ids are the same on every plan, so a chart works
 * on all of them. Each point carries the CLI's own string and the period it covers; nothing here adds,
 * subtracts or divides money.
 */
export function resolveSeries(
	run: ProjectionRun,
	accountNames: ReadonlyMap<string, string> = new Map(),
): Resolved[] {
	return [
		...annualFigures(run),
		...accountFigures(run, accountNames),
		...cashflowFigures(run, accountNames),
		...taxFigures(run),
		...retirementFigures(run),
	]
}
