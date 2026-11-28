import type { RenderHint } from "../table"

/*
 * The human form of `projection model`: the model itself, then one line for its inflation factor
 * when it has one (cli ADR-0085). A model without a factor prints exactly as it did.
 */

type Factor = { buckets?: unknown }
type Bucket = { rateBps?: unknown; weight?: unknown }

/** One bucket's whole-basis-point rate and its part of the probability, out of 2^32. */
type WeightedRate = { rateBps: number; weight: number }

/** The whole probability the weights add up to, as the sim schema states it. */
const TWO_32 = 4_294_967_296n

/** The factor's buckets, or none when the object is not one. */
function bucketsOf(value: unknown): WeightedRate[] | undefined {
	if (typeof value !== "object" || value === null) return undefined
	const buckets = (value as Factor).buckets
	if (!Array.isArray(buckets) || buckets.length === 0) return undefined
	const rates = buckets.map((bucket) => {
		if (typeof bucket !== "object" || bucket === null) return undefined
		const { rateBps, weight } = bucket as Bucket
		if (typeof rateBps !== "number" || !Number.isInteger(rateBps)) return undefined
		if (typeof weight !== "number" || !Number.isInteger(weight)) return undefined
		return { rateBps, weight }
	})
	return rates.every((rate): rate is WeightedRate => rate !== undefined) ? rates : undefined
}

/** `total / denominator` rounded to the nearest integer, halves upward, as Math.round does. */
function roundHalfUp(total: bigint, denominator: bigint): bigint {
	const scaled = total + denominator / 2n
	const quotient = scaled / denominator
	return scaled % denominator < 0n ? quotient - 1n : quotient
}

/** The mean, weighted by each bucket's `weight / 2^32`, in exact integers: no float touches a rate. */
function weightedMean(rates: readonly WeightedRate[]): number {
	let total = 0n
	for (const rate of rates) total += BigInt(rate.rateBps) * BigInt(rate.weight)
	return Number(roundHalfUp(total, TWO_32))
}

/** The line: how many buckets, their mean, and the range they span. */
function inflationLine(value: unknown): string[] {
	const rates = bucketsOf(value)
	if (rates === undefined) return []
	const numbers = rates.map((rate) => rate.rateBps)
	return [
		`Inflation: ${rates.length} buckets, mean ${weightedMean(rates)} bps, from ${Math.min(...numbers)} to ${Math.max(...numbers)} bps a year`,
	]
}

/** The human form's inflation line, printed only when the model carries a factor (cli ADR-0085). */
export const modelHint: RenderHint = { blocks: (data) => inflationLine(data["inflation"]) }
