import type { Estate, EstateCost, EstateGift, Growth, Rounding } from "../types"
import { oracleDeflate } from "./oracle-money"

/** What one row owns and owes, by Account, in minor units (the oracle reads values, never code). */
export interface OracleWorth {
	readonly assets: Readonly<Record<string, bigint>>
	readonly owed: Readonly<Record<string, bigint>>
}

export interface OracleEstate {
	readonly gross: bigint
	readonly debts: bigint
	readonly costs: readonly bigint[]
	readonly net: bigint
	readonly gifts: readonly bigint[]
	readonly toHeirs: bigint
}

const sum = (values: readonly bigint[]): bigint => values.reduce((a, b) => a + b, 0n)
const atLeastZero = (value: bigint): bigint => (value < 0n ? 0n : value)

/** `num / den` of a non-negative `num` as `rounding` says: the whole part, then the remainder against half. */
function ratio(num: bigint, den: bigint, rounding: Rounding): bigint {
	const whole = num / den
	const rest = num - whole * den
	if (rest === 0n || rounding === "floor") return whole
	return rounding === "ceil" || rest * 2n >= den ? whole + 1n : whole
}

/** `amount` grown by `years` whole yearly steps, one half-up rounding at the end, by exact powers. */
function grown(amount: number, growth: Growth, years: number, inflation: number): bigint {
	const step = 10_000n + BigInt(growth === "inflation" ? inflation : growth.bps)
	return ratio(BigInt(amount) * step ** BigInt(years), 10_000n ** BigInt(years), "halfUp")
}

function share(base: bigint, bps: number, rounding: Rounding): bigint {
	return ratio(atLeastZero(base) * BigInt(bps), 10_000n, rounding)
}

interface Footing {
	readonly years: number
	readonly inflation: number
}

function cost(line: EstateCost, worth: OracleWorth, gross: bigint, at: Footing): bigint {
	if ("amount" in line) return grown(line.amount, line.growth, at.years, at.inflation)
	if (line.of === "gross") return share(gross, line.bps, line.rounding)
	return share(sum(line.of.accounts.map((id) => worth.assets[id] ?? 0n)), line.bps, line.rounding)
}

/** The oracle's Estate statement: each figure by its definition, with plain loops and exact rationals. */
export function oracleEstate(
	worth: OracleWorth,
	estate: Estate | undefined,
	at: Footing,
): OracleEstate {
	const gross = sum(Object.values(worth.assets))
	const debts = sum(Object.values(worth.owed))
	const costs = (estate?.costs ?? []).map((line) => cost(line, worth, gross, at))
	const net = gross - debts - sum(costs)
	let left = atLeastZero(net)
	const gifts = (estate?.gifts ?? []).map((line: EstateGift) => {
		const wanted =
			"amount" in line
				? grown(line.amount, line.growth, at.years, at.inflation)
				: share(net, line.bps, line.rounding)
		let taken = wanted
		if (taken > left) taken = left
		left -= taken
		return taken
	})
	return { gross, debts, costs, net, gifts, toHeirs: left }
}

export interface OracleReal {
	readonly net: bigint
	readonly toHeirs: bigint
}

/**
 * The real figures: the row's real net worth less each cost deflated once, and, when the nominal heirs'
 * share is above zero, that less each gift deflated once, never below zero.
 */
export function oracleReal(
	realWorth: bigint,
	estate: OracleEstate,
	days: number,
	inflation: number,
): OracleReal {
	const deflated = (amounts: readonly bigint[]): bigint =>
		sum(amounts.map((amount) => oracleDeflate(amount, inflation, days)))
	const net = realWorth - deflated(estate.costs)
	if (estate.toHeirs === 0n) return { net, toHeirs: 0n }
	return { net, toHeirs: atLeastZero(net - deflated(estate.gifts)) }
}
