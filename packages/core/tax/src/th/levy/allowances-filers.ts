import {
	addRetirementAllowances,
	type ThRetirementAllowanceMeasures,
} from "./allowances-retirement"
import type { ThLevyFilerReads } from "./filer-reads"
import type { ThLevyGraph } from "./graph"
import { sumMeasures } from "./graph-rates"
import { ThLevyMeasureId } from "./measure-ids"

/**
 * Emits the retirement allowances of every Filer, each capped against that Filer's own income.
 *
 * Purpose: Applies the 500,000 THB cluster ceiling and the percentage caps per Filer on a joint
 * Return, then adds them (tax ADR 0009; research notes 3–4). One Filer is the plain computation.
 * Math: `cluster = sum over Filers of cluster(f)`; `thaiEsg = sum over Filers of thaiEsg(f)`.
 * Units: Measure ids over integer satang.
 * Throws: TaxValidationError if a statutory ceiling is not valid satang.
 *
 * @param graph Measure graph being built.
 * @param reads Each Filer's tallies and assessable income.
 * @statute Thailand Revenue Code Section 47; Ministerial Regulations No. 126, 390.
 */
export function addFilerRetirementAllowances(
	graph: ThLevyGraph,
	reads: readonly ThLevyFilerReads[],
): ThRetirementAllowanceMeasures {
	const [only] = reads
	if (reads.length === 1 && only !== undefined) {
		return addRetirementAllowances(graph, only.tallies, only.assessable)
	}
	const each = reads.map((read) =>
		addRetirementAllowances(graph, read.tallies, read.assessable, false),
	)
	return {
		cluster: sumMeasures(
			graph,
			each.map((item) => item.cluster),
			ThLevyMeasureId.RetirementCluster,
		),
		thaiEsg: sumMeasures(
			graph,
			each.map((item) => item.thaiEsg),
			ThLevyMeasureId.ThaiEsg,
		),
	}
}
