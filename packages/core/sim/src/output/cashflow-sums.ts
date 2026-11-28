import { addTo } from "../engine/add"
import type { DayLines } from "../engine/day-lines"
import type { DayTotals } from "../engine/occurrence"
import type { Period } from "./periods"

/** One period's sums of every day's lines: planned amounts, contributions, Levies and Accounts. */
export interface PeriodSums {
	readonly planned: ReadonlyMap<string, bigint>
	readonly applied: ReadonlyMap<string, bigint>
	readonly unfunded: ReadonlyMap<string, bigint>
	readonly employer: ReadonlyMap<string, bigint>
	readonly prepaid: ReadonlyMap<string, bigint>
	readonly settled: ReadonlyMap<string, bigint>
	readonly drawn: ReadonlyMap<string, bigint>
	readonly surplus: ReadonlyMap<string, bigint>
	readonly transfers: ReadonlyMap<string, bigint>
	readonly unmoved: ReadonlyMap<string, bigint>
}

/** The sums under construction: the same groups, each map writable. */
export type MutableSums = { -readonly [K in keyof PeriodSums]: Map<string, bigint> }

function addAll(into: Map<string, bigint>, from: ReadonlyMap<string, bigint>): void {
	for (const [key, amount] of from) addTo(into, key, amount)
}

/** Empty sums, one map per line group. */
export function emptySums(): MutableSums {
	return {
		planned: new Map<string, bigint>(),
		applied: new Map<string, bigint>(),
		unfunded: new Map<string, bigint>(),
		employer: new Map<string, bigint>(),
		prepaid: new Map<string, bigint>(),
		settled: new Map<string, bigint>(),
		drawn: new Map<string, bigint>(),
		surplus: new Map<string, bigint>(),
		transfers: new Map<string, bigint>(),
		unmoved: new Map<string, bigint>(),
	}
}

/** Adds one day's lines into `sums`. */
export function addLines(sums: MutableSums, lines: DayLines): void {
	addAll(sums.planned, lines.planned)
	addAll(sums.applied, lines.applied)
	addAll(sums.unfunded, lines.unfunded)
	addAll(sums.employer, lines.employer)
	addAll(sums.prepaid, lines.prepaid)
	addAll(sums.settled, lines.settled)
	addAll(sums.drawn, lines.drawn)
	addAll(sums.surplus, lines.surplus)
	addAll(sums.transfers, lines.transfers)
	addAll(sums.unmoved, lines.unmoved)
}

/** Sums the lines of the days that land within `period`, both ends inclusive. */
export function sumPeriod(totals: readonly DayTotals[], period: Period): PeriodSums {
	const sums = emptySums()
	for (const total of totals) {
		if (total.lines === undefined || total.date < period.from || total.date > period.to) continue
		addLines(sums, total.lines)
	}
	return sums
}
