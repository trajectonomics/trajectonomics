import { oracleHalfTable, roundToMillionths } from "./oracle-normal"

/**
 * An independent build of the plan Return model: exact BigInt fixed point at 10^40 rather than the
 * engine's integer bisection, the 12th root by Newton's method, and the quantiles from the oracle's own
 * derivation. It imports only `oracle-normal` and mirrors no engine file.
 */
const ONE = 10n ** 40n
const BP = ONE / 10_000n

export interface OracleAccount {
	readonly rate: number
	readonly compounding?: "monthly" | "quarterly" | "semiannual" | "annual"
	readonly volatility: number
}

const PER_YEAR = { monthly: 12, quarterly: 4, semiannual: 2, annual: 1 } as const

function root(value: bigint, power: bigint): bigint {
	let guess = ONE
	for (let step = 0; step < 200; step++) {
		let rest = ONE
		for (let k = 1n; k < power; k++) rest = (rest * guess) / ONE
		guess = ((power - 1n) * guess + (value * ONE) / rest) / power
	}
	return guess
}

function sqrt(value: bigint): bigint {
	let guess = ONE
	for (let step = 0; step < 200; step++) guess = (guess + (value * ONE) / guess) / 2n
	return guess
}

function yearlyFactor({ rate, compounding }: OracleAccount): bigint {
	if (compounding === undefined) return ONE + BigInt(rate) * BP
	const n = BigInt(PER_YEAR[compounding])
	let factor = ONE
	for (let k = 0n; k < n; k++) factor = (factor * (ONE + (BigInt(rate) * BP) / n)) / ONE
	return factor
}

/** The unrounded span return of every bucket, in 10^-40 of a unit (one basis point is `BP`). */
function exactColumn(account: OracleAccount, buckets: number): readonly bigint[] {
	const m = root(yearlyFactor(account), 12n) - ONE
	const s = (BigInt(account.volatility) * BP * ONE) / sqrt(12n * ONE)
	const upper = oracleHalfTable(buckets).map(roundToMillionths)
	const z = [...upper.map((value) => -value).reverse(), ...upper]
	return z.map((quantile) => m + (quantile * s) / 1_000_000n)
}

/** Whole basis points by sorting remainders: floor each, give the surplus to the largest remainders. */
export function oracleColumn(account: OracleAccount, buckets: number): readonly number[] {
	const values = exactColumn(account, buckets)
	const floors = values.map(floorBp)
	const total = floorBp(values.reduce((sum, value) => sum + value, 0n) + BP / 2n)
	const rest = values.map((value, index) => value - floors[index]! * BP)
	const surplus = Number(total - floors.reduce((sum, value) => sum + value, 0n))
	const ranked = rest.map((remainder, index) => ({ remainder, index }))
	ranked.sort((a, b) =>
		a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
	)
	const promoted = new Set(ranked.slice(0, surplus).map((item) => item.index))
	return floors.map((value, index) => Number(value) + (promoted.has(index) ? 1 : 0))
}

function floorBp(value: bigint): bigint {
	const quotient = value / BP
	return value % BP !== 0n && value < 0n ? quotient - 1n : quotient
}
