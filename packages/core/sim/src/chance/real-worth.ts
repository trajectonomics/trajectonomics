import type { EngineSnapshot } from "../engine/snapshot"
import type { PricePath } from "../money/inflation"
import type { Period } from "../output/periods"
import { realValues } from "../output/real"
import type { RuleMap } from "../output/rules"
import type { DateString, MinorUnits } from "../types"
import type { ProjectionProblem } from "../types/projection"

export type RealWorthResult =
	| { readonly ok: true; readonly real?: readonly MinorUnits[] }
	| { readonly ok: false; readonly problem: ProjectionProblem }

/**
 * Each Annual roll-up's closing net worth in the path's own today's money: the run's latest snapshot
 * at or before the roll-up's `to`, deflated by the path's prices. A path that ran out is pinned at the
 * real value it died with, exactly as the nominal `netWorth` is. Absent prices mean no `real`, and the
 * determinism of the run is untouched (ADR 0033).
 */
export function realWorth(
	snapshots: readonly EngineSnapshot[],
	rules: RuleMap,
	start: DateString,
	prices: PricePath | undefined,
	grid: readonly Period[],
	opening: bigint,
): RealWorthResult {
	if (prices === undefined) return { ok: true }
	const real: MinorUnits[] = []
	let at = 0
	let last = opening
	for (const period of grid) {
		while (at < snapshots.length && snapshots[at]!.date <= period.to) {
			const values = realValues(snapshots[at]!, rules, start, prices)
			if (values.problem !== undefined) return { ok: false, problem: values.problem }
			last = values.values!.netWorth
			at++
		}
		real.push(Number(last))
	}
	return { ok: true, real }
}
