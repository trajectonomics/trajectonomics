import type { RenderHint } from "../table"

/*
 * The human form of `projection model`: the model itself, then one line for its inflation factor
 * when it has one (cli ADR-0085). A model without a factor prints exactly as it did.
 */

type Factor = { buckets?: unknown }
type Bucket = { rateBps?: unknown }

/** The factor's rates, or none when the object is not one. */
function ratesOf(value: unknown): number[] | undefined {
	if (typeof value !== "object" || value === null) return undefined
	const buckets = (value as Factor).buckets
	if (!Array.isArray(buckets) || buckets.length === 0) return undefined
	const rates = buckets.map((bucket) =>
		typeof bucket === "object" && bucket !== null ? (bucket as Bucket).rateBps : undefined,
	)
	return rates.every((rate): rate is number => typeof rate === "number") ? rates : undefined
}

/** The line: how many buckets, their mean, and the range they span. */
function inflationLine(value: unknown): string[] {
	const rates = ratesOf(value)
	if (rates === undefined) return []
	const mean = Math.round(rates.reduce((total, rate) => total + rate, 0) / rates.length)
	return [
		`Inflation: ${rates.length} buckets, mean ${mean} bps, from ${Math.min(...rates)} to ${Math.max(...rates)} bps a year`,
	]
}

export const modelHint: RenderHint = { blocks: (data) => inflationLine(data["inflation"]) }
