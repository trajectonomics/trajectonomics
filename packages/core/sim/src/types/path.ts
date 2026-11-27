import type { AccountId, BasisPoints, DateString, MinorUnits } from "./common"
import type { ReturnModel } from "./market"
import type { Projection, ProjectionProblem, RunsOut } from "./projection"

/** What one Market path of a chance came to: the same figures the Bands are read from (ADR 0011). */
export interface ChancePathOutcome {
	/** The path's 0-based position in the run, under the run's seed. */
	readonly index: number
	/** Net worth at the last Annual roll-up; a path that ran out is pinned at what it died with. */
	readonly closingNetWorth: MinorUnits
	/** The least closing net worth of any of the path's Annual roll-ups. */
	readonly lowestNetWorth: MinorUnits
	/** The index of the first Annual roll-up that closed at `lowestNetWorth`. */
	readonly lowestAt: number
	/** Present only when the path ran out. */
	readonly runsOut?: RunsOut
	/** Fire dates by Milestone id; present only with `milestoneDates` and `outcomes` (ADR 0011). */
	readonly milestones?: Readonly<Record<string, DateString>>
}

/** Which Market path `projectPath` replays: path `index` of the run `model`, `seed` and `paths` define. */
export interface PathSelection {
	readonly model: ReturnModel
	/** Exactly 16 lower-case hex digits. */
	readonly seed: string
	/** The run's path count, 1..10,000, as in the chance-of-success options. */
	readonly paths: number
	/** 0-based and below `paths`: a path the run did not draw is refused. */
	readonly index: number
}

/** One Account's compounded return over one Annual roll-up of a Market path. */
export interface PathAccountReturn {
	readonly account: AccountId
	/** Basis points, rounded half away from zero. */
	readonly returnBps: BasisPoints
}

/** Every Account's return over one Annual roll-up. */
export interface PathRollupReturns {
	readonly index: number
	readonly from: DateString
	readonly to: DateString
	/** The path's own inflation over the roll-up; present only when it has a Price path (ADR 0033). */
	readonly inflationBps?: BasisPoints
	readonly accounts: readonly PathAccountReturn[]
}

/** The Projection of one Market path, with the returns it drew. */
export interface PathProjection extends Projection {
	/** One entry per Annual roll-up in order, one return per Account in the model. */
	readonly returns: readonly PathRollupReturns[]
}

export type PathProjectionResult =
	| { readonly ok: true; readonly projection: PathProjection }
	| { readonly ok: false; readonly problems: readonly ProjectionProblem[] }
