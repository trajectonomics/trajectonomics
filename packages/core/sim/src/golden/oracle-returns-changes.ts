import type { DateString } from "../types"
import { oracleCountedDays } from "./oracle-date"
import type { OracleRow, OracleSeries } from "./oracle-returns"

/** An amount added (or, negative, taken) on a date. */
export interface OracleChange {
	readonly date: DateString
	readonly delta: bigint
}

interface Lot {
	readonly amount: bigint
	readonly from: DateString
}

function later(a: DateString, b: DateString): DateString {
	return a > b ? a : b
}

function earlier(a: DateString, b: DateString): DateString {
	return a < b ? a : b
}

/** The lots inside one row: the carried balance, then each change that lands in `[row.from, end)`. */
function lotsOf(
	carried: bigint,
	start: DateString,
	row: OracleRow,
	end: DateString,
	changes: readonly OracleChange[],
): Lot[] {
	const lots: Lot[] = [{ amount: carried, from: later(start, row.from) }]
	for (const change of changes) {
		if (change.date > start && change.date >= row.from && change.date < end) {
			lots.push({ amount: change.delta, from: change.date })
		}
	}
	return lots
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
		const whole = BigInt(10000 * row.days)
		let numerator = 0n
		for (const lot of lotsOf(carried, start, row, end, changes)) {
			const held = BigInt(oracleCountedDays(lot.from, end))
			numerator += lot.amount * (whole + BigInt(row.returnBps) * held)
		}
		carried = numerator < 0n ? 0n : (2n * numerator + whole) / (2n * whole)
	}
	return carried
}
