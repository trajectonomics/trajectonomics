import { BoundedCache } from "../bounded-cache"
import type { BasisPoints } from "../types"
import { DAYS_PER_YEAR, dailyFactor, RATE_SCALE } from "./factor"
import { roundHalfUp } from "./round"
import { roundScaled, scaledRatio } from "./scaled"

const factorPowers: Map<BasisPoints, bigint[]> = new Map()
const ratePowers: Map<BasisPoints, bigint[]> = new Map()

function powerAt(rate: BasisPoints, exponent: number, rateBase: boolean): bigint {
	const cache = rateBase ? ratePowers : factorPowers
	let powers = cache.get(rate)
	if (powers === undefined) {
		powers = [1n]
		cache.set(rate, powers)
	}
	const base = rateBase ? RATE_SCALE + BigInt(rate) : dailyFactor(rate)
	while (powers.length <= exponent) powers.push(powers[powers.length - 1]! * base)
	return powers[exponent]!
}

interface FactorParts {
	readonly numerator: bigint
	readonly denominator: bigint
}

/** A factor and its inverse as fixed-point ratios: all a rounding needs unless it is too close to call. */
interface FactorRatios {
	readonly up: bigint
	readonly down: bigint
}

function splitDays(days: number): readonly [years: number, remainder: number] {
	if (!Number.isSafeInteger(days) || days < 0) {
		throw new RangeError("Growth expects a non-negative safe integer day count")
	}
	const years = Math.floor(days / DAYS_PER_YEAR)
	return [years, days - years * DAYS_PER_YEAR]
}

/** `(10000 + rate)^years * f^remainder / (10000^years * 10^(30*remainder))`. */
function buildParts(rate: BasisPoints, days: number): FactorParts {
	const [years, remainder] = splitDays(days)
	return {
		numerator: powerAt(rate, years, true) * powerAt(rate, remainder, false),
		denominator: powerAt(0, years, true) * powerAt(0, remainder, false),
	}
}

const ratioCache: BoundedCache<number, FactorRatios> = new BoundedCache(65536)

/** The ratios of a factor, kept by rate and days: small numbers, so many can be kept. */
function factorRatios(rate: BasisPoints, days: number): FactorRatios {
	splitDays(days)
	const key = Math.abs(rate) < 1_048_576 && days < 4_294_967_296 ? rate * 4_294_967_296 + days : NaN
	const cached = ratioCache.get(key)
	if (cached !== undefined) return cached
	const { numerator, denominator } = buildParts(rate, days)
	const ratios = {
		up: scaledRatio(numerator, denominator),
		down: scaledRatio(denominator, numerator),
	}
	if (!Number.isNaN(key)) ratioCache.set(key, ratios)
	return ratios
}

/** Grows `amount` over `days` counted days with one half-up rounding at the end. */
export function grow(amount: bigint, rate: BasisPoints, days: number): bigint {
	if (amount === 0n) return 0n
	if (amount > 0n && (days === 0 || rate === 0)) return amount
	const exact = (): bigint => {
		const { numerator, denominator } = buildParts(rate, days)
		return roundHalfUp(amount * numerator, denominator)
	}
	return roundScaled(amount, factorRatios(rate, days).up, exact)
}

/** Today's-money value of `amount` at `inflation`, over `days` counted days. */
export function deflate(amount: bigint, inflation: BasisPoints, days: number): bigint {
	if (amount === 0n) return 0n
	if (amount > 0n && (days === 0 || inflation === 0)) return amount
	const exact = (): bigint => {
		const { numerator, denominator } = buildParts(inflation, days)
		return roundHalfUp(amount * denominator, numerator)
	}
	return roundScaled(amount, factorRatios(inflation, days).down, exact)
}
