import { deflate } from "../money/growth"
import type { BasisPoints } from "../types"

export interface RealFigures {
	readonly net: bigint
	readonly toHeirs: bigint
}

/**
 * The statement in today's money, deflated as the row's `realNetWorth` is (ADR 0025): that figure already
 * deflates each Account's two parts and sums them signed, and each cost and gift is deflated once, half up,
 * then taken off. With no cost `net` is `realNetWorth`; `toHeirs` is 0 whenever the nominal one is.
 */
export function realFigures(
	realNetWorth: bigint,
	costs: readonly bigint[],
	gifts: readonly bigint[],
	toHeirs: bigint,
	inflation: BasisPoints,
	days: number,
): RealFigures {
	const taken = (amounts: readonly bigint[]) =>
		amounts.reduce((sum, amount) => sum + deflate(amount, inflation, days), 0n)
	const net = realNetWorth - taken(costs)
	if (toHeirs === 0n) return { net, toHeirs: 0n }
	const left = net - taken(gifts)
	return { net, toHeirs: left < 0n ? 0n : left }
}
