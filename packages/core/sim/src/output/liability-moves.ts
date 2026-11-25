import type { DayTotals } from "../engine/occurrence"
import type { AccountId } from "../types"
import type { LiabilityMonth } from "../types/statement"
import type { StatementMonth } from "./statement-months"

export interface Moves {
	readonly drawn: readonly bigint[]
	readonly paid: readonly bigint[]
	readonly transferred: readonly bigint[]
}

/** Sums one liability's borrowing and payments into each statementMonth. Totals are in date order. */
export function movesOf(
	totals: readonly DayTotals[],
	statementMonths: readonly StatementMonth[],
	id: AccountId,
): Moves {
	const drawn = statementMonths.map(() => 0n)
	const paid = statementMonths.map(() => 0n)
	const transferred = statementMonths.map(() => 0n)
	let index = 0
	for (const day of totals) {
		while (index < statementMonths.length - 1 && statementMonths[index]!.to < day.date) index++
		drawn[index] = drawn[index]! + (day.drawnBy.get(id) ?? 0n)
		paid[index] = paid[index]! + (day.paidBy.get(id) ?? 0n)
		transferred[index] = transferred[index]! + (day.transferredTo.get(id) ?? 0n)
	}
	return { drawn, paid, transferred }
}

/** One month row; `transferred` is listed only for a liability a transfer Flow pays down (ADR 0031). */
export function monthRow(
	statementMonth: StatementMonth,
	figures: Record<"before" | "drawn" | "paid" | "transferred" | "interest" | "closing", bigint>,
	listed: boolean,
): LiabilityMonth {
	const { before, drawn, paid, transferred, interest, closing } = figures
	return {
		from: statementMonth.from,
		to: statementMonth.to,
		opening: Number(before),
		drawn: Number(drawn),
		paid: Number(paid),
		...(listed ? { transferred: Number(transferred) } : {}),
		interest: Number(interest),
		closing: Number(closing),
		partial: statementMonth.partial,
	}
}
