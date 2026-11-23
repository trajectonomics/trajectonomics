import type { BasisPoints, DateString, MinorUnits } from "./common"
import type { ReturnModel } from "./market"
import type { ProjectionProblem } from "./projection"

/** The run inputs `chanceOfSuccess` takes beside the Baseline, Scenario and Timeline. */
export interface ChanceOfSuccessOptions {
	readonly model: ReturnModel
	/** Exactly 16 lower-case hex digits. */
	readonly seed: string
	/** Market paths, 1..10,000. */
	readonly paths: number
}

/** One nearest-rank net-worth Percentile across Market paths. */
export interface ChancePercentile {
	readonly level: number
	readonly value: MinorUnits
}

/** The net-worth Percentiles across Market paths at one Annual roll-up end date. */
export interface ChanceBand {
	readonly index: number
	readonly to: DateString
	readonly netWorth: readonly ChancePercentile[]
}

/** The Percentiles of what the rule Flows paid across Market paths in one Annual roll-up (ADR 0024). */
export interface ChanceSpendingBand {
	readonly index: number
	readonly to: DateString
	readonly spending: readonly ChancePercentile[]
}

/** The Percentiles, across the paths that have one, of each path's lowest roll-up spending. */
export interface ChanceLowestYear {
	/** Paths with a lowest year: they paid in some roll-up that a full roll-up follows or is. */
	readonly paths: number
	/** The five Percentiles; empty when no path has a lowest year. */
	readonly spending: readonly ChancePercentile[]
}

/** What the plan's rule Flows paid across Market paths; present only when the Scenario has one. */
export interface ChanceSpending {
	readonly bands: readonly ChanceSpendingBand[]
	readonly lowestYear: ChanceLowestYear
}

/** How many failing Market paths first ran out in one Annual roll-up period. */
export interface ChanceRunsOut {
	readonly index: number
	readonly to: DateString
	readonly paths: number
}

/** The inputs a chance of success was computed from, echoed verbatim. */
export interface ChanceOfSuccessDefinition {
	readonly modelId: string
	readonly seed: string
	readonly paths: number
}

/** The chance of success of one plan over seeded Market paths. */
export interface ChanceOfSuccess {
	readonly definition: ChanceOfSuccessDefinition
	readonly paths: number
	readonly succeeded: number
	/** Floored share of Market paths with no Runs-out through the horizon, in basis points. */
	readonly successBps: BasisPoints
	readonly bands: readonly ChanceBand[]
	readonly runsOut: readonly ChanceRunsOut[]
	/** Spending Bands, present only when the Scenario declares a rule Flow (ADR 0024). */
	readonly spending?: ChanceSpending
}

export type ChanceOfSuccessResult =
	| { readonly ok: true; readonly chance: ChanceOfSuccess }
	| { readonly ok: false; readonly problems: readonly ProjectionProblem[] }
