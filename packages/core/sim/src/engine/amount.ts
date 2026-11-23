import { grow } from "../money/growth"
import type { BasisPoints, FixedAmount, Flow, Growth } from "../types"

export type FixedFlow = Flow & FixedAmount

/** `amount` grown by whole annual steps: `years` of `growth`, with the engine's one half-up rounding. */
export function grownAmount(
	amount: number,
	growth: Growth,
	years: number,
	inflation: BasisPoints,
): bigint {
	const rate = growth === "inflation" ? inflation : growth.bps
	return grow(BigInt(amount), rate, years * 365)
}

/** A fixed Flow's amount at an occurrence, grown from the original by whole annual steps. */
export function fixedAmountAt(flow: FixedFlow, years: number, inflation: BasisPoints): bigint {
	return grownAmount(flow.amount, flow.growth, years, inflation)
}
