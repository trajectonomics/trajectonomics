import type { PlanTotal } from "./plan-totals"
import { sumNullable, sumOf } from "./sum"

/** Every plan's totals added up, for the summary's tiles and the breakdown's closing row. */
export type GrandTotal = {
	tokensTotal: number
	tokensUncached: number
	requests: number
	activeDays: number
	tokensIn: number | null
	tokensOut: number | null
	cacheRead: number | null
	cacheWrite: number | null
}

/** Every plan's tokens, requests and reported breakdown parts added up. */
export function grandTotal(totals: readonly PlanTotal[]): GrandTotal {
	return {
		tokensTotal: sumOf(totals, (total) => total.tokensTotal),
		tokensUncached: sumOf(totals, (total) => total.tokensUncached),
		requests: sumOf(totals, (total) => total.requests),
		activeDays: sumOf(totals, (total) => total.activeDays),
		tokensIn: sumNullable(totals.map((total) => total.tokensIn)),
		tokensOut: sumNullable(totals.map((total) => total.tokensOut)),
		cacheRead: sumNullable(totals.map((total) => total.cacheRead)),
		cacheWrite: sumNullable(totals.map((total) => total.cacheWrite)),
	}
}
