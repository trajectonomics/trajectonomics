import type { ThAssumptionFact } from "./facts"
import type { ThAssumptionStatus, ThUnconfirmedFigure } from "./unconfirmed-types"

/**
 * Builds one unconfirmed-figure entry.
 *
 * Purpose: Keeps the record one short call per figure.
 * Math: No arithmetic.
 * Units: `note` names the figure's unit.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Sections 40–48; `references/th/SOURCES.md`.
 */
export function figure(
	status: ThAssumptionStatus,
	path: string,
	note: string,
	...usedBy: readonly ThAssumptionFact[]
): ThUnconfirmedFigure {
	return { path, status, note, usedBy }
}
