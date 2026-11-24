import { countedDays } from "../calendar/counted"
import { roundHalfUp } from "../money/round"
import type { DateString } from "../types"
import type { ResolvedRow, ResolvedSeries } from "./returns"

const SPAN_SCALE = 10000n

/**
 * `amount` after `held` of a row's `days`, rounded once, half-up (ADR 0005). Only `earning` of it,
 * the part held since the row's start or added since, takes `r * held / days`: what the Account
 * already earned inside the row takes nothing, so a change mid-row adds no `r²` term. The result
 * never falls below zero: a withdrawal of the whole balance mid-row leaves nothing.
 */
function spanGrow(amount: bigint, earning: bigint, row: ResolvedRow, held: number): bigint {
	const denominator = SPAN_SCALE * BigInt(row.days)
	const numerator = amount * denominator + earning * BigInt(row.returnBps) * BigInt(held)
	return numerator < 0n ? 0n : roundHalfUp(numerator, denominator)
}

/** The first row that ends after `asOf`; the rows end in ascending order, so every earlier one held nothing. */
function firstOpenRow(series: ResolvedSeries, asOf: DateString): number {
	let low = 0
	let high = series.length
	while (low < high) {
		const middle = (low + high) >> 1
		if (series[middle]!.to <= asOf) low = middle + 1
		else high = middle
	}
	return low
}

/** What a read starts from: an Account's balance at `asOf`, and the part of it still to earn in that row. */
export interface Opening {
	readonly balance: bigint
	readonly asOf: DateString
	readonly earning?: bigint
}

/**
 * The value after every row that ended by some date, for one `balance` measured at `asOf`. A whole
 * row holds the same days whatever date is read, so a later read resumes here and rounds exactly as
 * a read from `asOf` would. `base` is what the next row to walk still has to earn.
 */
export interface Walked {
	readonly balance: bigint
	readonly earning: bigint
	readonly asOf: DateString
	readonly index: number
	readonly amount: bigint
	readonly base: bigint
}

/** Where a read starts: the kept walk when it can resume, else the first row that ends after `asOf`. */
function startOf(
	from: Walked | undefined,
	open: Opening,
	date: DateString,
	series: ResolvedSeries,
): Walked {
	const { balance, asOf } = open
	const earning = open.earning ?? balance
	const same = from?.balance === balance && from.earning === earning && from.asOf === asOf
	if (same && (from.index === 0 || series[from.index - 1]!.to <= date)) return from
	const index = firstOpenRow(series, asOf)
	return { balance, earning, asOf, index, amount: balance, base: earning }
}

/** The counted days of a row that fall in `[asOf, date]`. */
function heldIn(row: ResolvedRow, asOf: DateString, date: DateString): number {
	return countedDays(asOf > row.from ? asOf : row.from, date < row.to ? date : row.to)
}

/**
 * Applies every Return row's span return over the counted days `[asOf, date]` holds. Alongside the
 * value it gives the part still to earn in the row `date` falls in: all of it at a row's start, else
 * what the row started with.
 */
export function walkRows(
	open: Opening,
	date: DateString,
	series: ResolvedSeries,
	from?: Walked,
): { readonly amount: bigint; readonly earning: bigint; readonly walked: Walked } {
	let walked = startOf(from, open, date, series)
	let { amount, base } = walked
	for (let index = walked.index; index < series.length; index++) {
		const row = series[index]!
		if (row.from >= date) break
		const held = heldIn(row, open.asOf, date)
		if (held > 0) amount = spanGrow(amount, base, row, held)
		if (row.to > date) break
		base = amount
		walked = { ...walked, index: index + 1, amount, base }
	}
	return { amount, earning: base, walked }
}
