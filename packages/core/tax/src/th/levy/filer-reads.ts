import { addAssessableMeasures } from "./assessable"
import type { ThLevyScope } from "./filer-tallies"
import type { ThLevyGraph } from "./graph"
import type { ThLevyProfile } from "./profile-types"
import { addSection40_4 } from "./regimes"
import type { ThLevyTallies } from "./tallies"

/**
 * What one Filer's share of a Return reads: the tallies and the assessable income they make.
 *
 * Purpose: The percentage caps of the retirement allowances are worked out on a Filer's own income.
 * Math: No arithmetic; ids only.
 * Units: Measure ids over integer satang.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Section 47; Ministerial Regulations No. 126, 390.
 */
export interface ThLevyFilerReads {
	/** The Filer's tallies, with the Filer's share of the shared income. */
	readonly tallies: ThLevyTallies
	/** The Filer's Section 40 assessable income. */
	readonly assessable: string
}

/**
 * Emits each Filer's assessable income, when the Return has more than one Filer.
 *
 * Purpose: Gives the per-Filer retirement caps their base. A Return with one view reads the whole
 * Return's assessable income, and emits nothing more.
 * Math: Each Filer's Section 40(4) split and Section 40 total, the same as the Return's.
 * Units: Measure ids over integer satang.
 * Throws: TaxValidationError if the corporate tax rate is outside [0, 1).
 *
 * @param graph Measure graph being built.
 * @param scope What the Levy reads.
 * @param profile Emit-time profile with the Section 40(4) elections.
 * @param assessable The whole Return's assessable income Measure.
 * @statute Thailand Revenue Code Sections 40(1)–(8), 47, 57 sexies.
 */
export function addFilerReads(
	graph: ThLevyGraph,
	scope: ThLevyScope,
	profile: ThLevyProfile,
	assessable: string,
): readonly ThLevyFilerReads[] {
	if (scope.views.length === 1) return [{ tallies: scope.total, assessable }]
	return scope.views.map((tallies) => {
		const section40_4 = addSection40_4(graph, tallies, profile.section40_4, false)
		return { tallies, assessable: addAssessableMeasures(graph, tallies, section40_4, false).total }
	})
}
