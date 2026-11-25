import { rowsBefore, rowsUpTo, type Series, sumUpTo, unsafe } from "./balance-series"

/**
 * The most and least an Account's Balance reaches from each row on, over the dates on which it
 * has a Balance (the last row of a date: the rows of one date make one Balance, not several).
 */
export type Reach = { readonly high: readonly bigint[]; readonly low: readonly bigint[] }

const endsDate = (series: Series, at: number): boolean => series.dates[at] !== series.dates[at + 1]

/** One pass from the last row back, so a later question about the Account costs no scan. */
export const reachOf = (series: Series): Reach => {
	const high: bigint[] = new Array(series.sums.length)
	const low: bigint[] = new Array(series.sums.length)
	let top = series.sums.at(-1)!
	let bottom = top
	for (let at = series.sums.length - 1; at >= 0; at--) {
		const sum = series.sums[at]!
		if (endsDate(series, at)) {
			if (sum > top) top = sum
			if (sum < bottom) bottom = sum
		}
		high[at] = top
		low[at] = bottom
	}
	return Object.freeze({ high, low })
}

/** What an Account's Balance reaches the first time it is not a safe integer: on which date, and at what sum. */
export type Overflow = { readonly date: string; readonly sum: bigint }

/**
 * The first date from `from` (inclusive) to `before` (exclusive; none means no end) on which the
 * Account's Balance, with `shift` added, is not a safe integer. Its Balance changes only on the
 * dates of its Postings, so those and `from` are the dates it can overflow on. `reach` is read only
 * when a later Balance could overflow, and the dates are scanned only when one does.
 */
export const firstOverflow = (
	series: Series | undefined,
	reach: () => Reach,
	shift: bigint,
	from: string,
	before?: string,
): Overflow | undefined => {
	const start = sumUpTo(series, from) + shift
	if (unsafe(start)) return Object.freeze({ date: from, sum: start })
	if (series === undefined) return undefined
	const first = rowsUpTo(series, from)
	const end = before === undefined ? series.dates.length : rowsBefore(series, before)
	if (first >= end) return undefined
	const { high, low } = reach()
	if (!unsafe(high[first]! + shift) && !unsafe(low[first]! + shift)) return undefined
	for (let at = first; at < end; at++) {
		const sum = series.sums[at]! + shift
		if (endsDate(series, at) && unsafe(sum)) {
			return Object.freeze({ date: series.dates[at]!, sum })
		}
	}
	return undefined
}
