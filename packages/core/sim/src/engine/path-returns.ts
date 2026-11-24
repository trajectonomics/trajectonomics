import { addDays } from "../calendar/arith"
import { countedDays } from "../calendar/counted"
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
 * fractions: each row takes `held` of its `days` of its return (ADR 0005), the factors multiply, and
 * the one division rounds half away from zero.
 */
function compounded(series: ResolvedSeries, open: DateString, to: DateString): number {
	let top = 1n
	let bottom = 1n
	for (const row of series) {
		const held = countedDays(later(open, row.from), earlier(to, row.to))
		if (row.from >= to || row.to <= open || held <= 0) continue
		const days = SCALE * BigInt(row.days)
		top *= days + BigInt(row.returnBps) * BigInt(held)
		bottom *= days
	}
	const change = (top - bottom) * SCALE
	const magnitude = ((change < 0n ? -change : change) * 2n + bottom) / (2n * bottom)
	return Number(change < 0n ? -magnitude : magnitude)
}

/**
 * Each Account's return over each Annual roll-up of a Market path: the days from the roll-up's first
 * day to its last, each day growing into the next, so a year of whole months compounds those twelve
 * months. A roll-up that starts on the horizon holds no day and returns 0.
 */
export function pathReturnsOf(
	returns: Returns,
	timeline: Timeline,
	annual: readonly AnnualRollup[],
): readonly PathRollupReturns[] {
	const resolved = resolveReturns(returns, timeline)
	return annual.map((rollup) => {
		const end = addDays(rollup.to, 1)
		return {
			index: rollup.index,
			from: rollup.from,
			to: rollup.to,
			accounts: returns.series.map(({ account }) => ({
				account,
				returnBps: compounded(resolved.get(account)!, rollup.from, end),
			})),
		}
	})
}
