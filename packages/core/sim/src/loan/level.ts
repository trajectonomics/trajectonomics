import { BoundedCache } from "../bounded-cache"
import { roundedDivide } from "../levy/scale"
import type { CompoundingPeriod, MinorUnits, Rounding } from "../types"

/** Compounding periods a nominal Account has in one year. */
export type PeriodsPerYear = 1 | 2 | 4 | 12

/** The most payments a loan may have: monthly payments from year 0001 through 9998. */
export const MAX_LEVEL_PAYMENTS: number = 9998 * 12

/** Periods per year of each Compounding period that a level payment can follow. */
export const PERIODS_PER_YEAR: Readonly<Record<CompoundingPeriod, PeriodsPerYear>> = {
	monthly: 12,
	quarterly: 4,
	semiannual: 2,
	annual: 1,
}

export interface LevelPaymentInput {
	/** The amount borrowed, in minor units. */
	readonly principal: MinorUnits
	/** The nominal annual rate in basis points, non-negative. */
	readonly rate: number
	readonly periodsPerYear: PeriodsPerYear
	/** The number of equal payments, from 1 to `MAX_LEVEL_PAYMENTS`. */
	readonly payments: number
	readonly rounding: Rounding
}

/** Whether `input` is in the range `levelPayment` accepts. */
export function isLevelInput(input: LevelPaymentInput): boolean {
	return (
		Number.isSafeInteger(input.principal) &&
		input.principal >= 0 &&
		Number.isSafeInteger(input.rate) &&
		input.rate >= 0 &&
		Number.isSafeInteger(input.payments) &&
		input.payments >= 1 &&
		input.payments <= MAX_LEVEL_PAYMENTS
	)
}

/**
 * The exact payment as a fraction `num / den`. With `a = rate` and `b = 10000 · m`, the level payment
 * is `P · a · (b + a)^n / (b · ((b + a)^n − b^n))`; at a zero rate it is `P / n`.
 */
function exactFraction(input: LevelPaymentInput): readonly [bigint, bigint] {
	const principal = BigInt(input.principal)
	const payments = BigInt(input.payments)
	const rate = BigInt(input.rate)
	if (rate === 0n) return [principal, payments]
	const base = 10000n * BigInt(input.periodsPerYear)
	const grown = (base + rate) ** payments
	const plain = base ** payments
	return [principal * rate * grown, base * (grown - plain)]
}

const cache = new BoundedCache<string, { readonly payment: MinorUnits | undefined }>(512)

/**
 * The level payment that pays `principal` off in `payments` equal payments at a nominal annual
 * `rate` compounded `periodsPerYear` times. It is computed exactly in BigInt and rounded once with
 * `rounding`. `undefined` when the input is out of range or the payment is not a safe integer.
 */
export function levelPayment(input: LevelPaymentInput): MinorUnits | undefined {
	if (!isLevelInput(input)) return undefined
	const key = [
		input.principal,
		input.rate,
		input.periodsPerYear,
		input.payments,
		input.rounding,
	].join("|")
	const known = cache.get(key)
	if (known !== undefined) return known.payment
	const [num, den] = exactFraction(input)
	const rounded = roundedDivide(num, den, input.rounding)
	const payment = rounded <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(rounded) : undefined
	cache.set(key, { payment })
	return payment
}
