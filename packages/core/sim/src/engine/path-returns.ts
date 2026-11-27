import { addDays } from "../calendar/arith"
import { countedDays } from "../calendar/counted"
import { priceChangeBps } from "../money/price-path"
import type { DateString, Timeline } from "../types"
import type { PathRollupReturns } from "../types/path"
import type { AnnualRollup } from "../types/projection"
import { resolveReturns } from "./return-rows"
import type { ResolvedSeries, Returns } from "./returns"

const SCALE = 10000n

/** The latest of two dates, and the earliest of two. */
const later = (a: DateString, b: DateString): DateString => (a > b ? a : b)
const earlier = (a: DateString, b: DateString): DateString => (a < b ? a : b)

/**
 * The compounded return of one Return series over `[open, to]` in basis points, in exact BigInt
 * fractions. A row accrues linearly, as the engine does (ADR 0005): the `held` days of a row after
 * `before` earlier days grow its balance by `(days + r·(before + held)) / (days + r·before)`, so the
 * pieces of a row split across roll-ups multiply back to the row's `1 + r`. Rows multiply, and the one
 * division rounds half away from zero.
 */
function compounded(series: ResolvedSeries, open: DateString, to: DateString): number {
	let top = 1n
	let bottom = 1n
	for (const row of series) {
		const held = countedDays(later(open, row.from), earlier(to, row.to))
		if (row.from >= to || row.to <= open || held <= 0) continue
		const days = SCALE * BigInt(row.days)
		const before = BigInt(countedDays(row.from, later(open, row.from)))
		const rate = BigInt(row.returnBps)
		top *= days + rate * (before + BigInt(held))
		bottom *= days + rate * before
	}
	const change = (top - bottom) * SCALE
	const magnitude = ((change < 0n ? -change : change) * 2n + bottom) / (2n * bottom)
	return Number(change < 0n ? -magnitude : magnitude)
}

/**
 * Each Account's return over each Annual roll-up of a Market path: the market's growth from the
 * roll-up's first day through its last day, including the last day's growth. Months compound; days
 * within a month accrue linearly. `closingNetWorth` is read on `to`, before that day's growth, so the
 * two cover different days, and a roll-up that is only the horizon day reports 0.
 */
export function pathReturnsOf(
	returns: Returns,
	timeline: Timeline,
	annual: readonly AnnualRollup[],
): readonly PathRollupReturns[] {
	const resolved = resolveReturns(returns, timeline)
	const prices = returns.prices
	return annual.map((rollup) => {
		const end = addDays(rollup.to, 1)
		return {
			index: rollup.index,
			from: rollup.from,
			to: rollup.to,
			...(prices === undefined
				? {}
				: { inflationBps: priceChangeBps(prices, rollup.from, rollup.to) }),
			accounts: returns.series.map(({ account }) => ({
				account,
				returnBps: compounded(resolved.get(account)!, rollup.from, end),
			})),
		}
	})
}
