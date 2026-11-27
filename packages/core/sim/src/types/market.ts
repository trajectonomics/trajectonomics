import type { Problem } from "../check/codes"
import type { AccountId, BasisPoints } from "./common"

/** One month's span returns for every Account in a Return model, with an integer weight. */
export interface MarketBucket {
	/** One span return per Account in `ReturnModel.accounts`, in the same order. */
	readonly returnsBps: readonly BasisPoints[]
	/** Non-negative safe integer; the weights of a model sum to exactly 2^32. */
	readonly weight: number
}

/** One year's rate of inflation, with an integer weight; a factor's weights sum to exactly 2^32. */
export interface InflationBucket {
	/** The year's rate, from -9999 to 10000 bps. */
	readonly rateBps: BasisPoints
	/** Non-negative safe integer; a factor's weights sum to exactly 2^32. */
	readonly weight: number
}

/** The inflation one Market path draws its year rates from (ADR 0033). */
export interface InflationFactor {
	readonly buckets: readonly InflationBucket[]
}

/** A joint bucket table: weighted market months, each with one span return per Account. */
export interface ReturnModel {
	readonly id: string
	readonly accounts: readonly AccountId[]
	readonly buckets: readonly MarketBucket[]
	/** One year's rate per Market path; absent when inflation stays at the Scenario's `inflation`. */
	readonly inflation?: InflationFactor
}

/** What `planReturnModel` takes beside the Scenario. */
export interface PlanReturnModelOptions {
	/** A power of two from 16 to 1024. */
	readonly buckets: number
}

/** How many buckets of one Account's span return were clamped to the Return model's range (ADR 0029). */
export interface PlanReturnModelNote {
	readonly account: AccountId
	readonly clamped: number
}

/** The Return model a plan implies, and the clamps made while building it. */
export type PlanReturnModelResult =
	| {
			readonly ok: true
			readonly model: ReturnModel
			readonly notes: readonly PlanReturnModelNote[]
			/** How many inflation buckets the plan's range clamped; present only when above 0 (ADR 0033). */
			readonly inflationClamped?: number
	  }
	| { readonly ok: false; readonly problems: readonly Problem[] }
