/**
 * An exact-rational oracle for a Price path. It imports nothing from `money/` or `engine/`: the year
 * products, the linear in-year rule and the one half-up rounding are written out here.
 */
const SCALE = 10_000n
const YEAR = 3_650_000n

export interface OracleParts {
	readonly num: bigint
	readonly den: bigint
}

function rateAt(rates: readonly number[], outside: number, year: number): number {
	return year >= 0 && year < rates.length ? rates[year]! : outside
}

/** `Π_{j=a}^{b-1}(10000 + rateAt(j))`, the outside rate before 0 and past the drawn years. */
export function oracleSteps(
	rates: readonly number[],
	outside: number,
	a: number,
	b: number,
): bigint {
	let product = 1n
	for (let year = a; year < b; year++) product *= SCALE + BigInt(rateAt(rates, outside, year))
	return product
}

export function oracleInflate(
	amount: bigint,
	rates: readonly number[],
	outside: number,
	n: number,
	endYear: number,
): bigint {
	const numerator = amount * oracleSteps(rates, outside, endYear - n, endYear)
	const denominator = SCALE ** BigInt(n)
	return (2n * numerator + denominator) / (2n * denominator)
}

/** The price level as `num / den`: whole years compounded, the year holding `days` linear. */
export function oracleParts(rates: readonly number[], outside: number, days: number): OracleParts {
	const years = Math.floor(days / 365)
	const rest = days - 365 * years
	const rate = BigInt(rateAt(rates, outside, years))
	return {
		num: oracleSteps(rates, outside, 0, years) * (YEAR + rate * BigInt(rest)),
		den: SCALE ** BigInt(years) * YEAR,
	}
}

export function oracleDeflate(
	amount: bigint,
	rates: readonly number[],
	outside: number,
	days: number,
): bigint {
	const { num, den } = oracleParts(rates, outside, days)
	return (2n * amount * den + num) / (2n * num)
}

/** A signed fraction rounded half away from zero. */
function signed(numerator: bigint, denominator: bigint): bigint {
	const top = numerator < 0n ? -numerator : numerator
	const magnitude = (2n * top + denominator) / (2n * denominator)
	return numerator < 0n ? -magnitude : magnitude
}

/** `10000 × (P(to) − P(from)) / P(from)` as one BigInt fraction. */
export function oracleChangeBps(
	rates: readonly number[],
	outside: number,
	fromDays: number,
	toDays: number,
): number {
	const from = oracleParts(rates, outside, fromDays)
	const to = oracleParts(rates, outside, toDays)
	const top = SCALE * to.num * from.den - SCALE * from.num * to.den
	return Number(signed(top, from.num * to.den))
}
