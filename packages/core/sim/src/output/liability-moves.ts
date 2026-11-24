import type { DayTotals } from "../engine/occurrence"
import type { AccountId } from "../types"
import type { LiabilityMonth } from "../types/statement"
import type { StatementPeriod } from "./statement-periods"

export interface Moves {
	readonly drawn: readonly bigint[]
	readonly paid: readonly bigint[]
	readonly transferred: readonly bigint[]
}

/** Sums one liability's borrowing and payments into each period. Totals are in date order. */
export function movesOf(
	totals: readonly DayTotals[],
	periods: readonly StatementPeriod[],
	id: AccountId,
): Moves {
	const drawn = periods.map(() => 0n)
	const paid = periods.map(() => 0n)
	const transferred = periods.map(() => 0n)
	let index = 0
	for (const day of totals) {
		while (index < periods.length - 1 && periods[index]!.to < day.date) index++
		drawn[index] = drawn[index]! + (day.drawnBy.get(id) ?? 0n)
		paid[index] = paid[index]! + (day.paidBy.get(id) ?? 0n)
		transferred[index] = transferred[index]! + (day.transferredTo.get(id) ?? 0n)
	}
	return { drawn, paid, transferred }
}

/** One month row; `transferred` is listed only for a liability a transfer Flow pays down (ADR 0031). */
export function monthRow(
	period: StatementPeriod,
	figures: Record<"before" | "drawn" | "paid" | "transferred" | "interest" | "closing", bigint>,
	listed: boolean,
): LiabilityMonth {
	const { before, drawn, paid, transferred, interest, closing } = figures
	return {
		from: period.from,
		to: period.to,
		opening: Number(before),
		drawn: Number(drawn),
		paid: Number(paid),
		...(listed ? { transferred: Number(transferred) } : {}),
		interest: Number(interest),
		closing: Number(closing),
		partial: period.partial,
	}
}
