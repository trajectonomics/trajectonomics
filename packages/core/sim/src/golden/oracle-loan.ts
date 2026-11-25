/**
 * Independent oracle for a nominal monthly loan. It walks every calendar day in exact integers and
 * imports nothing from the engine: the level payment is a naive rational loop, and interest is
 * accrued on each counted day and capitalised at each month end, rounded half up.
 */

type Rounding = "floor" | "halfUp" | "ceil"

const ONE: Ratio = [1n, 1n]

type Ratio = readonly [bigint, bigint]

const times = (a: Ratio, b: Ratio): Ratio => [a[0] * b[0], a[1] * b[1]]
const minus = (a: Ratio, b: Ratio): Ratio => [a[0] * b[1] - b[0] * a[1], a[1] * b[1]]
const over = (a: Ratio, b: Ratio): Ratio => [a[0] * b[1], a[1] * b[0]]

/** The level payment for `principal` over `payments` months at `annualBps` nominal, in exact rationals. */
export function oraclePayment(
	principal: bigint,
	annualBps: bigint,
	payments: number,
	rounding: Rounding,
): bigint {
	const step: Ratio = [annualBps, 120_000n]
	let growth: Ratio = ONE
	const onePlus: Ratio = [step[0] + step[1], step[1]]
	for (let k = 0; k < payments; k++) growth = times(growth, onePlus)
	const [num, den] = over(times([principal, 1n], times(step, growth)), minus(growth, ONE))
	return roundRational(num, den, rounding)
}

/** A rational rounded to a whole number under the stated rule; ties go up when `halfUp`. */
export function roundRational(num: bigint, den: bigint, rounding: Rounding): bigint {
	const whole = num / den
	const rest = num - whole * den
	if (rounding === "floor") return whole
	if (rounding === "ceil") return rest === 0n ? whole : whole + 1n
	return rest * 2n >= den ? whole + 1n : whole
}

export interface LoanSchedule {
	/** Owed at the start of the first month, before its first day. */
	readonly opening: bigint
	readonly annualBps: bigint
	readonly principal: bigint
	readonly payments: number
	readonly rounding: Rounding
	/** Days in each calendar month, from the first month onward. */
	readonly monthDays: readonly number[]
	/** Whether a planned payment lands on this day of this month (both 1-based indices). */
	readonly paidOn: (month: number, day: number) => boolean
}

interface Walk {
	capitalised: bigint
	numerator: bigint
}

/** One day: the balance accrues, a month end capitalises, then a planned payment lands. */
function stepDay(
	walk: Walk,
	schedule: LoanSchedule,
	planned: bigint,
	last: boolean,
	paid: boolean,
	den: bigint,
): void {
	walk.numerator += walk.capitalised
	if (last) {
		walk.capitalised += roundRational(walk.numerator * schedule.annualBps, den, "halfUp")
		walk.numerator = 0n
	}
	if (!paid) return
	const accrued = roundRational(walk.numerator * schedule.annualBps, den, "halfUp")
	const owed = walk.capitalised + accrued
	let pay = planned
	if (owed < pay) pay = owed
	if (pay > walk.capitalised) {
		walk.capitalised += accrued
		walk.numerator = 0n
	}
	walk.capitalised -= pay
}

/** The owed amount at each month end, after that day's payments; the oracle's answer for the engine. */
export function walkLoan(schedule: LoanSchedule): readonly bigint[] {
	const planned = oraclePayment(
		schedule.principal,
		schedule.annualBps,
		schedule.payments,
		schedule.rounding,
	)
	const walk: Walk = { capitalised: schedule.opening, numerator: 0n }
	const values: bigint[] = []
	for (let month = 0; month < schedule.monthDays.length; month++) {
		const days = schedule.monthDays[month] ?? 0
		const den = 120_000n * BigInt(days)
		for (let day = 1; day <= days; day++) {
			stepDay(walk, schedule, planned, day === days, schedule.paidOn(month, day), den)
		}
		values.push(walk.capitalised)
	}
	return values
}
