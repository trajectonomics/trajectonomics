import { countedDays } from "../calendar/counted"
import type { BasisPoints, DateString } from "../types"
import { RATE_SCALE } from "./factor"
import type { PricePath } from "./inflation"
import { powBigInt } from "./pow"
import { scaledRatio } from "./scaled"

/** A 365-day year in basis-point units: the base of the linear in-year rate. */
const YEAR_BP_DAYS = 3_650_000n

/** A whole-year product as exact numerator and denominator, with its fixed-point ratio. */
export interface Steps {
	readonly num: bigint
	readonly den: bigint
	readonly scaled: bigint
}

interface PriceParts {
	readonly num: bigint
	readonly den: bigint
}

const ONE: Steps = { num: 1n, den: 1n, scaled: scaledRatio(1n, 1n) }
const levelsByPath: WeakMap<PricePath, readonly bigint[]> = new WeakMap()
const stepsByPath: WeakMap<PricePath, Map<number, Steps>> = new WeakMap()

/** The year's rate: its drawn one inside the path, the outside rate before it and past its end. */
export function rateAt(path: PricePath, year: number): BasisPoints {
	if (!Number.isSafeInteger(year)) throw new RangeError(`A year must be a safe integer: ${year}`)
	const rate = year >= 0 && year < path.ratesBps.length ? path.ratesBps[year]! : path.outsideBps
	if (!Number.isSafeInteger(rate) || rate <= -10_000) {
		throw new RangeError(`A price path rate must be a safe integer above -10000 bps: ${rate}`)
	}
	return rate
}

function factorAt(path: PricePath, year: number): bigint {
	return RATE_SCALE + BigInt(rateAt(path, year))
}

/** `levels[k]` is the product of the first `k` year factors, from 1. */
function levels(path: PricePath): readonly bigint[] {
	const kept = levelsByPath.get(path)
	if (kept !== undefined) return kept
	const values: bigint[] = [1n]
	for (let year = 0; year < path.ratesBps.length; year++) {
		values.push(values[year]! * factorAt(path, year))
	}
	levelsByPath.set(path, values)
	return values
}

/** `(a + 256) * 4096 + b`, for the year pairs that fit its slots; others are simply not kept. */
function cacheKey(a: number, b: number): number | undefined {
	return a >= -256 && b >= 0 && b < 4096 ? (a + 256) * 4096 + b : undefined
}

/** `Π_{j=a}^{b-1}(10000 + rateAt(j))` over `10000^(b-a)`, 1 over 1 when `a >= b`. */
export function steps(path: PricePath, a: number, b: number): Steps {
	if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) {
		throw new RangeError(`Steps take safe-integer years: ${a}, ${b}`)
	}
	if (a >= b) return ONE
	const key = cacheKey(a, b)
	const kept = key === undefined ? undefined : stepsByPath.get(path)?.get(key)
	if (kept !== undefined) return kept
	const length = path.ratesBps.length
	const low = Math.max(a, 0)
	const high = Math.min(b, length)
	const values = levels(path)
	let num = low < high ? values[high]! / values[low]! : 1n
	// The years outside the drawn range read `outsideBps`: [a, min(b, 0)) and [max(a, length), b).
	if (a < 0) num *= powBigInt(factorAt(path, -1), Math.min(b, 0) - a)
	if (b > length) {
		const first = Math.max(a, length)
		num *= powBigInt(factorAt(path, length), b - first)
	}
	const den = powBigInt(RATE_SCALE, b - a)
	const found: Steps = {
		num,
		den,
		scaled: scaledRatio(num, den),
	}
	if (key !== undefined) {
		const cache = stepsByPath.get(path) ?? new Map<number, Steps>()
		stepsByPath.set(path, cache)
		cache.set(key, found)
	}
	return found
}

/** The price level as `num / den`: whole years compounded, the year holding `days` linear. */
export function priceParts(path: PricePath, days: number): PriceParts {
	if (!Number.isSafeInteger(days) || days < 0) {
		throw new RangeError(`A price level takes a non-negative safe-integer day count: ${days}`)
	}
	const years = Math.floor(days / 365)
	const rest = days - 365 * years
	const { num } = steps(path, 0, years)
	return {
		num: num * (YEAR_BP_DAYS + BigInt(rateAt(path, years)) * BigInt(rest)),
		den: RATE_SCALE ** BigInt(years) * YEAR_BP_DAYS,
	}
}

/** The inflation of an Annual roll-up in bps: the price level's change from `from` through `to`'s last day. */
export function priceChangeBps(path: PricePath, from: DateString, to: DateString): BasisPoints {
	const before = priceParts(path, countedDays(path.start, from))
	const after = priceParts(path, countedDays(path.start, to) + 1)
	const top = 10_000n * after.num * before.den - 10_000n * before.num * after.den
	const bottom = before.num * after.den
	const magnitude = ((top < 0n ? -top : top) * 2n + bottom) / (2n * bottom)
	return Number(top < 0n ? -magnitude : magnitude)
}
