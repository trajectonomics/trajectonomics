import type { Check } from "./codes"
import { boundedInt } from "./scalars"
import { checkShape, isRecord, list, req } from "./shape"

const TWO_32 = 4294967296
const MAX_BUCKETS = 1024

const rate = boundedInt(-9999, 10_000, "RATE_OUT_OF_RANGE")
const weight = boundedInt(0, TWO_32, "INVALID_WEIGHT")

const bucket: Check = (value, path, emit) => {
	checkShape(value, path, { rateBps: req(rate), weight: req(weight) }, emit)
}

/** Every weight, or `undefined` as soon as one is not a non-negative safe integer within 2^32. */
function weightsOf(buckets: readonly unknown[]): readonly number[] | undefined {
	const weights: number[] = []
	for (const entry of buckets) {
		if (!isRecord(entry)) return undefined
		const found = entry["weight"]
		if (typeof found !== "number" || !Number.isSafeInteger(found) || found < 0) return undefined
		if (found > TWO_32) return undefined
		weights.push(found)
	}
	return weights
}

/** A Return model's `inflation` factor: one rate per bucket, and weights that total exactly 2^32. */
export const checkInflation: Check = (value, path, emit) => {
	checkShape(value, path, { buckets: req(list(bucket)) }, emit)
	if (!isRecord(value)) return
	const buckets = value["buckets"]
	if (!Array.isArray(buckets)) return
	if (buckets.length > MAX_BUCKETS) emit("TOO_MANY_ENTRIES", [...path, "buckets"])
	const weights = weightsOf(buckets)
	if (weights === undefined) return
	const total = weights.reduce((sum, item) => sum + BigInt(item), 0n)
	if (total !== BigInt(TWO_32)) emit("RETURN_WEIGHT_TOTAL", [...path, "buckets"])
}
