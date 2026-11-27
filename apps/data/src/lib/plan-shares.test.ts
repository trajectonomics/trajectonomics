import { describe, expect, test } from "bun:test"
import { planSegments, SEGMENT_LABELS, shareSentence } from "./plan-shares"

const FULL = { tokensIn: 10, tokensOut: 20, cacheRead: 30, cacheWrite: 40 }

describe("a plan's segmented bar", () => {
	test("divides the reported tokens into shares that sum to one", () => {
		const segments = planSegments(FULL)
		const shares = segments.map((segment) => segment.share)
		expect(shares).toEqual([0.1, 0.2, 0.3, 0.4])
		expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(1, 10)
	})

	test("draws its parts in the legend's order", () => {
		expect(planSegments(FULL).map((segment) => segment.key)).toEqual(
			SEGMENT_LABELS.map(([key]) => key),
		)
	})

	test("drops a part with no tokens and still sums to one", () => {
		const segments = planSegments({ ...FULL, cacheWrite: 0 })
		expect(segments.map((segment) => segment.key)).toEqual(["input", "output", "cacheRead"])
		expect(segments.reduce((sum, segment) => sum + segment.share, 0)).toBeCloseTo(1, 10)
	})

	test("treats a part the plan does not report as absent", () => {
		const segments = planSegments({ ...FULL, cacheWrite: null })
		expect(segments).toHaveLength(3)
		expect(segments[0]?.share).toBeCloseTo(1 / 6, 10)
	})

	test("is empty when the plan reports no breakdown", () => {
		expect(
			planSegments({ tokensIn: null, tokensOut: null, cacheRead: null, cacheWrite: null }),
		).toEqual([])
		expect(planSegments({ tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheWrite: 0 })).toEqual([])
	})
})

describe("a plan's spoken sentence", () => {
	test("names all four values, including a reported zero", () => {
		expect(
			shareSentence({
				planName: "Claude",
				tokensIn: 900_000_000,
				tokensOut: 1_000_000,
				cacheRead: 8_000_000_000,
				cacheWrite: 0,
			}),
		).toBe("Claude: input 900M, output 1M, cache read 8B, cache write 0.")
	})

	test("says that a plan reports no breakdown at all", () => {
		expect(
			shareSentence({
				planName: "Mistral",
				tokensIn: null,
				tokensOut: null,
				cacheRead: null,
				cacheWrite: null,
			}),
		).toBe("Mistral: no breakdown reported.")
	})
})
