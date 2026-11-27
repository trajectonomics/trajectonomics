import { growthYears } from "../calendar/arith"
import type { BasisPoints, DateString } from "../types"
import { deflate, grow } from "./growth"
import { priceParts, steps } from "./price-path"
import { roundHalfUp } from "./round"
import { roundScaled, scaledRatio } from "./scaled"

/** One Market path's yearly inflation from the Timeline start (ADR 0033). */
export interface PricePath {
	readonly start: DateString
	readonly ratesBps: readonly BasisPoints[]
	readonly outsideBps: BasisPoints
}

/** The inflation one run follows: the Scenario's one rate, or the Price path of its Market path. */
export type Inflation = BasisPoints | PricePath

/** `amount` grown by `n` whole years ending in the growth year `date` falls in. */
export function inflateBy(
	amount: bigint,
	inflation: Inflation,
	n: number,
	date: DateString,
): bigint {
	if (typeof inflation === "number") return grow(amount, inflation, n * 365)
	if (!Number.isSafeInteger(n) || n < 0) {
		throw new RangeError(`Inflation expects a non-negative safe-integer year count: ${n}`)
	}
	if (amount === 0n) return 0n
	if (amount > 0n && n === 0) return amount
	const end = date < inflation.start ? 0 : growthYears(inflation.start, date)
	const { num, den, scaled } = steps(inflation, end - n, end)
	return roundScaled(amount, scaled, () => roundHalfUp(amount * num, den))
}

/** Today's-money value of `amount` at `inflation`, over `days` counted from the Timeline start. */
export function deflateBy(amount: bigint, inflation: Inflation, days: number): bigint {
	if (typeof inflation === "number") return deflate(amount, inflation, days)
	if (amount === 0n) return 0n
	if (amount > 0n && days === 0) return amount
	const { num, den } = priceParts(inflation, days)
	return roundScaled(amount, scaledRatio(den, num), () => roundHalfUp(amount * den, num))
}
