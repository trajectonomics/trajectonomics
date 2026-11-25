import type { Problem } from "./codes"

const SIZES: ReadonlySet<number> = new Set([16, 32, 64, 128, 256, 512, 1024])

/** `buckets` must be a power of two from 16 to 1024, so each weighs exactly 2^32 / buckets. */
export function checkPlanOptions(value: unknown): readonly Problem[] {
	const buckets =
		typeof value === "object" && value !== null
			? (value as { buckets?: unknown }).buckets
			: undefined
	if (typeof buckets === "number" && SIZES.has(buckets)) return []
	return [{ code: "INVALID_BUCKETS", path: ["options", "buckets"] }]
}
