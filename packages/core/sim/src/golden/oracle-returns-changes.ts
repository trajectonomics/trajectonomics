import type { DateString } from "../types"
import { oracleCountedDays } from "./oracle-date"
import type { OracleSeries } from "./oracle-returns"

/** An amount added (or, negative, taken) on a date. */
export interface OracleChange {
	readonly date: DateString
	readonly delta: bigint
}

interface Lot {
	readonly amount: bigint
	readonly from: DateString
}

/** One row's money: what it has earned and keeps (`fixed`) and the lots still earning, all over `whole`. */
interface Pool {
	readonly fixed: bigint
	readonly lots: readonly Lot[]
}

interface Scale {
	readonly whole: bigint
	readonly bps: bigint
}

function later(a: DateString, b: DateString): DateString {
	return a > b ? a : b
}

function earlier(a: DateString, b: DateString): DateString {
	return a < b ? a : b
}

/** The pool's value on `date`, times `whole`, never below zero: each lot is worth `a·(1 + r·held/D)`. */
function worth(pool: Pool, date: DateString, scale: Scale): bigint {
	let sum = pool.fixed
	for (const lot of pool.lots) {
		sum += lot.amount * (scale.whole + scale.bps * BigInt(oracleCountedDays(lot.from, date)))
	}
	return sum < 0n ? 0n : sum
}

/**
 * A change takes its own lot. Where the pool was worth nothing, it starts again from the change; where the
 * change empties it, nothing is left to earn; where it takes more than the lots hold, the excess came out of
 * what the row had earned, so the rest is kept and earns nothing.
 */
function changed(pool: Pool, change: OracleChange, scale: Scale): Pool {
	const value = worth(pool, change.date, scale)
	const next = value + change.delta * scale.whole
	if (value === 0n || next === 0n) {
		return { fixed: 0n, lots: [{ amount: next === 0n ? 0n : change.delta, from: change.date }] }
	}
	const earning = pool.lots.reduce((sum, lot) => sum + lot.amount, 0n) + change.delta
	if (earning < 0n) return { fixed: next, lots: [] }
	return { fixed: pool.fixed, lots: [...pool.lots, { amount: change.delta, from: change.date }] }
}

/**
 * The neutral rule, lot by lot: inside a row, the balance held at the row's start and each amount
 * added or taken since is its own lot, and a lot grows by `1 + r·held/D` over the days it was held.
 * At a row's end the lots are one balance again, rounded half-up, and never below zero.
 */
export function oracleChangedValue(
	opening: bigint,
	start: DateString,
	changes: readonly OracleChange[],
	date: DateString,
	rows: OracleSeries,
): bigint {
	let carried = opening
	for (const row of rows) {
		const end = earlier(date, row.to)
		if (end <= row.from || end <= start) continue
		const scale = { whole: BigInt(10000 * row.days), bps: BigInt(row.returnBps) }
		const from = later(start, row.from)
		let pool: Pool = { fixed: 0n, lots: [{ amount: carried, from }] }
		for (const change of changes) {
			if (change.date > start && change.date >= row.from && change.date < end) {
				pool = changed(pool, change, scale)
			}
		}
		carried = (2n * worth(pool, end, scale) + scale.whole) / (2n * scale.whole)
	}
	return carried
}
