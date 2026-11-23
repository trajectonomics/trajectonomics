import { countedDays } from "../calendar/counted"
import { roundHalfUp } from "../money/round"
import type { DateString } from "../types"
import type { ResolvedRow, ResolvedSeries } from "./returns"

const SPAN_SCALE = 10000n

/** `amount` over `held` of a row's `days`, rounded once, half-up. */
function spanGrow(amount: bigint, returnBps: number, days: number, held: number): bigint {
	const denominator = SPAN_SCALE * BigInt(days)
	const numerator = amount * (denominator + BigInt(returnBps) * BigInt(held))
	return roundHalfUp(numerator, denominator)
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

/**
 * The value after every row that ended by some date, for one `balance` measured at `asOf`. A whole
 * row holds the same days whatever date is read, so a later read resumes here and rounds exactly as
 * a read from `asOf` would.
 */
export interface Walked {
	readonly balance: bigint
	readonly asOf: DateString
	readonly index: number
	readonly amount: bigint
}

/** Where a read starts: the kept walk when it can resume, else the first row that ends after `asOf`. */
function startOf(
	from: Walked | undefined,
	balance: bigint,
	asOf: DateString,
	date: DateString,
	series: ResolvedSeries,
): Walked {
	const kept = from?.balance === balance && from.asOf === asOf ? from : undefined
	if (kept !== undefined && (kept.index === 0 || series[kept.index - 1]!.to <= date)) return kept
	return { balance, asOf, index: firstOpenRow(series, asOf), amount: balance }
}

/** The counted days of a row that fall in `[asOf, date]`. */
function heldIn(row: ResolvedRow, asOf: DateString, date: DateString): number {
	return countedDays(asOf > row.from ? asOf : row.from, date < row.to ? date : row.to)
}

/** Applies every Return row's span return over the counted days `[asOf, date]` holds. */
export function walkRows(
	balance: bigint,
	asOf: DateString,
	date: DateString,
	series: ResolvedSeries,
	from?: Walked,
): { readonly amount: bigint; readonly walked: Walked } {
	let walked = startOf(from, balance, asOf, date, series)
	let amount = walked.amount
	for (let index = walked.index; index < series.length; index++) {
		const row = series[index]!
		if (row.from >= date) break
		const held = heldIn(row, asOf, date)
		if (held > 0) amount = spanGrow(amount, row.returnBps, row.days, held)
		if (row.to <= date) walked = { balance, asOf, index: index + 1, amount }
	}
	return { amount, walked }
}
