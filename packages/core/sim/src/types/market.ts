import type { Problem } from "../check/codes"
import type { AccountId, BasisPoints } from "./common"

/** One month's span returns for every Account in a Return model, with an integer weight. */
export interface MarketBucket {
	/** One span return per Account in `ReturnModel.accounts`, in the same order. */
	readonly returnsBps: readonly BasisPoints[]
	/** Non-negative safe integer; the weights of a model sum to exactly 2^32. */
	readonly weight: number
}

/** A joint bucket table: weighted market months, each with one span return per Account. */
export interface ReturnModel {
	readonly id: string
	readonly accounts: readonly AccountId[]
	readonly buckets: readonly MarketBucket[]
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
	  }
	| { readonly ok: false; readonly problems: readonly Problem[] }
