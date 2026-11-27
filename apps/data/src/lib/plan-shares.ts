import { compactCount } from "./format"
import type { PlanTotal } from "./plan-totals"
import { sumOf } from "./sum"

/** The four reported parts of a plan's tokens, in the order the bar draws them. */
export type SegmentKey = "input" | "output" | "cacheRead" | "cacheWrite"

/** One part of a plan's segmented bar: its count and its share of the plan's reported tokens. */
export type PlanSegment = { key: SegmentKey; label: string; tokens: number; share: number }

/** The legend's labels, in the same order the bar draws its segments. */
export const SEGMENT_LABELS: readonly (readonly [SegmentKey, string])[] = Object.freeze([
	["input", "Input"],
	["output", "Output"],
	["cacheRead", "Cache read"],
	["cacheWrite", "Cache write"],
])

/** The four parts a breakdown needs; a plan that reports none has all four null. */
type PlanParts = Pick<PlanTotal, "tokensIn" | "tokensOut" | "cacheRead" | "cacheWrite">

function partOf(total: PlanParts, key: SegmentKey): number | null {
	switch (key) {
		case "input":
			return total.tokensIn
		case "output":
			return total.tokensOut
		case "cacheRead":
			return total.cacheRead
		case "cacheWrite":
			return total.cacheWrite
	}
}

/**
 * A plan's four parts as shares of the tokens it reports, in bar order. A part with no tokens is
 * dropped, and an unreported plan gives an empty list, so the shares always sum to one otherwise.
 */
export function planSegments(total: PlanParts): PlanSegment[] {
	const parts = SEGMENT_LABELS.map(([key, label]) => ({
		key,
		label,
		tokens: partOf(total, key) ?? 0,
	}))
	const sum = sumOf(parts, (part) => part.tokens)
	if (sum === 0) return []
	return parts
		.filter((part) => part.tokens > 0)
		.map((part) => ({ ...part, share: part.tokens / sum }))
}

/** The four values as one sentence for a plan's row, naming each part the plan does not report. */
export function shareSentence(total: PlanParts & Pick<PlanTotal, "planName">): string {
	const reported = SEGMENT_LABELS.some(([key]) => partOf(total, key) !== null)
	if (!reported) return `${total.planName}: no breakdown reported.`
	const parts = SEGMENT_LABELS.map(([key, label]) => {
		const value = partOf(total, key)
		return `${label.toLowerCase()} ${value === null ? "not reported" : compactCount(value)}`
	})
	return `${total.planName}: ${parts.join(", ")}.`
}
