import type { LineSeries } from "../../chart"
import type { ProjectionRun } from "../../contract"
import { netWorthSeries } from "../projection/chart"
import type { Terms } from "../projection/terms"

/** The name a series carries in the what-if's chart: the what-if first, then the baseline it is drawn over. */
const WHAT_IF = "What-if"
const BASELINE = "Baseline"

/**
 * The net worth of the what-if drawn over the baseline's, each from its own `projection run` rows. The
 * baseline is drawn dashed and the what-if solid, so the two are told apart without colour; each series
 * name says which it is, which is also what the chart's text alternative lists. With amounts hidden the
 * baseline is left out, so the chart cannot show which way a hidden change moved.
 */
export function whatIfSeries(
	whatIf: ProjectionRun,
	baseline: ProjectionRun | null,
	terms: Terms,
	hidden = false,
): LineSeries[] {
	// Two runs in two terms would be four lines, and the dash tells baseline from what-if, so "both" draws nominal.
	const shown = terms === "both" ? "nominal" : terms
	const named = (run: ProjectionRun, prefix: string, dashed: boolean) =>
		netWorthSeries(run, shown).map(
			(series): LineSeries => ({
				...series,
				name: `${prefix}: ${series.name}`,
				dashed,
			}),
		)
	// With amounts hidden the baseline stays out: drawing it beside the what-if would show which way the change moved.
	return [
		...named(whatIf, WHAT_IF, false),
		...(baseline === null || hidden ? [] : named(baseline, BASELINE, true)),
	]
}
