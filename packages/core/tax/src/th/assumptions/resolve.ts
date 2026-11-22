import type { ThAssumptionFact } from "./facts"
import { TH_UNCONFIRMED_FIGURES } from "./unconfirmed"
import type { ThAssumptionStatus } from "./unconfirmed-types"
import { parameterValue, type ThAssumptionValue } from "./value"

/**
 * A figure a Thai tax computation used whose source is not yet confirmed.
 *
 * Purpose: Names the figure to the reader, so a result never states a number as settled law when
 * the engine only has a secondary source or an assumption for it.
 * Math: No arithmetic.
 * Units: As the parameter at `path`; `note` names it.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Sections 40–48; `references/th/SOURCES.md`.
 */
export interface ThAssumption {
	/** Collapsed parameter path in `TH_2026_PARAMETERS`. */
	readonly path: string
	/** The value the computation used: one number, or one per row of a statutory table. */
	readonly value: ThAssumptionValue
	/** `reported` when only a secondary source states it, `unsourced` when none was read. */
	readonly status: ThAssumptionStatus
	/** A short plain sentence saying what the figure is. */
	readonly note: string
}

/**
 * Purpose: Lists the unconfirmed figures a computation relied on.
 * Math: An unconfirmed figure is listed when any fact in its `usedBy` is in `facts`; the order is
 * the record's own, so the list is deterministic.
 * Units: Each value is in its parameter's unit.
 * Throws: TypeError if a record path is not a parameter (a test rules this out).
 * @statute Thailand Revenue Code Sections 40–48; `references/th/SOURCES.md`.
 */
export function thAssumptions(facts: ReadonlySet<ThAssumptionFact>): readonly ThAssumption[] {
	return TH_UNCONFIRMED_FIGURES.filter((entry) => entry.usedBy.some((fact) => facts.has(fact))).map(
		(entry) => ({
			path: entry.path,
			value: parameterValue(entry.path),
			status: entry.status,
			note: entry.note,
		}),
	)
}
