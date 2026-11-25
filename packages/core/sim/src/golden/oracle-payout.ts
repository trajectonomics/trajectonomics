import { oracleAddDays, oracleCountedDays } from "./oracle-date"
import { oracleGrow } from "./oracle-money"

export interface OraclePayoutInput {
	readonly opening: bigint
	readonly rate: number
	/** The yearly share paid out, in basis points. */
	readonly bps: number
	/** Months in one payout period: 1, 3, 6 or 12. */
	readonly months: 1 | 3 | 6 | 12
	readonly rounding: "floor" | "halfUp" | "ceil"
	readonly start: string
	readonly horizon: string
	/** The window of Due dates: on or after `from`, on or before `to`. */
	readonly from?: string
	readonly to?: string
}

export interface OraclePayouts {
	readonly paid: readonly { readonly date: string; readonly amount: bigint }[]
	/** The Account's value on the horizon, after every payout. */
	readonly closing: bigint
}

/** Whether `date` is the last day of a payout period: tomorrow is the first of a month after one. */
function endsPeriod(date: string, months: number): boolean {
	const [, month = 0] = date.split("-").map(Number)
	return oracleAddDays(date, 1).endsWith("-01") && month % months === 0
}

/** `value x bps / (10000 x periods a year)`, rounded by long division, never by a formula. */
function share(value: bigint, bps: number, months: number, rounding: string): bigint {
	const numerator = value * BigInt(bps)
	const denominator = 10_000n * BigInt(12 / months)
	const whole = numerator / denominator
	const left = numerator % denominator
	if (rounding === "ceil" && left > 0n) return whole + 1n
	if (rounding === "halfUp" && left * 2n >= denominator) return whole + 1n
	return whole
}

/**
 * Walks the Account day by day from `start`: on each period end inside the window it reads the value,
 * grown from its last commit over the counted days, pays the share and commits. Business days, Levies
 * and every other Flow are left out, so it prices a payout alone.
 */
export function oraclePayouts(input: OraclePayoutInput): OraclePayouts {
	const { rate, months, horizon } = input
	let value = input.opening
	let asOf = input.start
	const paid: { date: string; amount: bigint }[] = []
	for (let day = input.start; day <= horizon; day = oracleAddDays(day, 1)) {
		const inWindow = day >= (input.from ?? "0001-01-01") && day <= (input.to ?? "9999-12-31")
		if (!inWindow || !endsPeriod(day, months)) continue
		value = oracleGrow(value, rate, oracleCountedDays(asOf, day))
		const amount = share(value, input.bps, months, input.rounding)
		paid.push({ date: day, amount })
		value -= amount
		asOf = day
	}
	return { paid, closing: oracleGrow(value, rate, oracleCountedDays(asOf, horizon)) }
}
