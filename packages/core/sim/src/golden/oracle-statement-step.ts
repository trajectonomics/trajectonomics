import { roundRational } from "./oracle-loan"

/** One calendar day: the amounts that land on it, and where its compounding and statement month end. */
export interface OracleDay {
	readonly date: string
	/** 10,000 × periods a year × the counted days of the compounding period this day falls in. */
	readonly denominator: bigint
	/** False on a Feb 29, which Actual/365 No Leap leaves out of every accrual. */
	readonly counted: boolean
	/** The last day of its compounding period: the date its interest is Capitalised. */
	readonly compoundEnd: boolean
	/** The last day of its statement month, or the horizon. */
	readonly statementEnd: boolean
	/** The planned withdrawal that lands on the day. */
	readonly drawn: bigint
	/** The debt payment planned for the day; the payment is the lesser of this and the amount owed. */
	readonly planned: bigint
}

export interface Walk {
	capitalised: bigint
	numerator: bigint
	/** Interest capitalised in the current statement month. */
	posted: bigint
	/** The accrual left unposted at the previous statement month end. */
	carried: bigint
	drawn: bigint
	paid: bigint
	/** The owed amount after the previous landing, or the opening amount before the first one. */
	owed: bigint
}

export function newWalk(opening: bigint): Walk {
	return {
		capitalised: opening,
		numerator: 0n,
		posted: 0n,
		carried: 0n,
		drawn: 0n,
		paid: 0n,
		owed: opening,
	}
}

/** Interest on the running numerator, rounded half up once against the day's denominator. */
export function accrual(walk: Walk, annualBps: bigint, denominator: bigint): bigint {
	return roundRational(walk.numerator * annualBps, denominator, "halfUp")
}

function capitalise(walk: Walk, amount: bigint): void {
	walk.capitalised += amount
	walk.posted += amount
	walk.numerator = 0n
}

/** The day's withdrawal, then its payment: a payment above the capitalised balance settles first. */
function land(walk: Walk, annualBps: bigint, day: OracleDay): void {
	walk.capitalised += day.drawn
	walk.drawn += day.drawn
	if (day.planned === 0n) return
	const accrued = accrual(walk, annualBps, day.denominator)
	const owed = walk.capitalised + accrued
	let pay = day.planned
	if (owed < pay) pay = owed
	if (pay > walk.capitalised) capitalise(walk, accrued)
	walk.capitalised -= pay
	walk.paid += pay
}

/** Advances one day: the balance accrues, a compounding date capitalises, then the day's amounts land. */
export function step(walk: Walk, annualBps: bigint, day: OracleDay): void {
	if (day.counted) walk.numerator += walk.capitalised
	if (day.compoundEnd) capitalise(walk, accrual(walk, annualBps, day.denominator))
	land(walk, annualBps, day)
}

/** Records a landing's owed amount; returns the date when it is zero after a positive amount. */
export function noteLanding(walk: Walk, annualBps: bigint, day: OracleDay): string | undefined {
	if (day.drawn === 0n && day.planned === 0n) return undefined
	const owed = walk.capitalised + accrual(walk, annualBps, day.denominator)
	const payoff = walk.owed > 0n && owed === 0n ? day.date : undefined
	walk.owed = owed
	return payoff
}
