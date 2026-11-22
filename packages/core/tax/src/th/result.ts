import type { TaxResult } from "../core/system"
import type { ThAssumption } from "./assumptions/resolve"
import type { ThBreakdown } from "./types"

/**
 * The Thai tax result: the shared Tax Result envelope plus the figures it relied on.
 *
 * Purpose: Says, beside the numbers, which statutory figures the computation used whose source is
 * not yet confirmed (`reported` or `unsourced` in `references/th/SOURCES.md`).
 * Math: No arithmetic; `assumptions` is empty when every figure used is confirmed.
 * Units: As {@link TaxResult}.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Sections 40, 42 bis, 47, 48.
 */
export interface ThTaxResult extends TaxResult<"THB", ThBreakdown> {
	/** Unconfirmed figures this computation used, in a fixed order. */
	readonly assumptions: readonly ThAssumption[]
}
