import type { Inflation } from "../money/inflation"
import { inflateBy } from "../money/inflation"
import type { DateString, FixedAmount, Flow, Growth } from "../types"

export type FixedFlow = Flow & FixedAmount

/** `amount` grown by whole annual steps: `years` of `growth` ending in `date`'s growth year. */
export function grownAmount(
	amount: number,
	growth: Growth,
	years: number,
	inflation: Inflation,
	date: DateString,
): bigint {
	const rate = growth === "inflation" ? inflation : growth.bps
	return inflateBy(BigInt(amount), rate, years, date)
}

/** A fixed Flow's amount at an occurrence, grown from the original by whole annual steps. */
export function fixedAmountAt(
	flow: FixedFlow,
	years: number,
	inflation: Inflation,
	date: DateString,
): bigint {
	return grownAmount(flow.amount, flow.growth, years, inflation, date)
}
