import { oracleAddDays, oracleCountedDays } from "./oracle-date"
import { oracleGrow } from "./oracle-money"

export interface OracleFeeInput {
	readonly opening: bigint
	readonly rate: number
	/** The yearly fee, in basis points of value. */
	readonly bps: number
	readonly rounding: "floor" | "halfUp" | "ceil"
	readonly start: string
	readonly horizon: string
}

export interface OracleFees {
	readonly charged: readonly { readonly date: string; readonly amount: bigint }[]
	/** The Account's value on the horizon, after every charge. */
	readonly closing: bigint
}

/** `value x bps / 120000` by long division, never by a formula: a twelfth of the yearly share. */
function monthly(value: bigint, bps: number, rounding: string): bigint {
	const numerator = value * BigInt(bps)
	const whole = numerator / 120_000n
	const left = numerator % 120_000n
	if (rounding === "ceil" && left > 0n) return whole + 1n
	if (rounding === "halfUp" && left * 2n >= 120_000n) return whole + 1n
	return whole
}

/**
 * Walks the Account day by day from `start`: on each last day of a month it reads the value, grown from
 * its last commit over the counted days, takes the monthly share and commits. Business days, Levies and
 * every other Flow are left out, so it prices a fee alone.
 */
export function oracleFees(input: OracleFeeInput): OracleFees {
	let value = input.opening
	let asOf = input.start
	const charged: { date: string; amount: bigint }[] = []
	for (let day = input.start; day <= input.horizon; day = oracleAddDays(day, 1)) {
		if (!oracleAddDays(day, 1).endsWith("-01")) continue
		value = oracleGrow(value, input.rate, oracleCountedDays(asOf, day))
		const amount = monthly(value, input.bps, input.rounding)
		charged.push({ date: day, amount })
		value -= amount
		asOf = day
	}
	return { charged, closing: oracleGrow(value, input.rate, oracleCountedDays(asOf, input.horizon)) }
}
