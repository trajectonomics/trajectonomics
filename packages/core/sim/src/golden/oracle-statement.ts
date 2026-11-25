/**
 * Independent oracle for a liability statement. It walks every calendar day in exact integers and
 * imports nothing from the engine. A statement month's interest is what was capitalised in it, plus
 * the accrual left unposted at its end, less the accrual it started with.
 */
import { accrual, newWalk, noteLanding, type OracleDay, step } from "./oracle-statement-step"

export type { OracleDay } from "./oracle-statement-step"

export interface OracleMonth {
	readonly date: string
	readonly opening: bigint
	readonly drawn: bigint
	readonly paid: bigint
	readonly interest: bigint
	readonly closing: bigint
}

export interface OracleStatement {
	readonly months: readonly OracleMonth[]
	readonly paidOff?: string
}

/** Walks the days in order and reports each statement month's figures, and the payoff date. */
export function walkStatement(
	opening: bigint,
	annualBps: bigint,
	days: readonly OracleDay[],
): OracleStatement {
	const walk = newWalk(opening)
	const months: OracleMonth[] = []
	let monthOpening = opening
	let paidOff: string | undefined
	for (const day of days) {
		step(walk, annualBps, day)
		paidOff ??= noteLanding(walk, annualBps, day)
		if (!day.statementEnd) continue
		const accrued = accrual(walk, annualBps, day.denominator)
		const closing = walk.capitalised + accrued
		const interest = walk.posted + accrued - walk.carried
		months.push({
			date: day.date,
			opening: monthOpening,
			drawn: walk.drawn,
			paid: walk.paid,
			interest,
			closing,
		})
		monthOpening = closing
		walk.carried = accrued
		walk.posted = 0n
		walk.drawn = 0n
		walk.paid = 0n
	}
	return paidOff === undefined ? { months } : { months, paidOff }
}
