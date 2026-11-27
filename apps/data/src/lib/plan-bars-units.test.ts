import { describe, expect, test } from "bun:test"
import { barAriaLabel } from "./bar-words"
import { planBars } from "./plan-bars"
import type { Limit, Peak, PlanPeak } from "./types"

const DAY = "2026-11-27"
const OLD = { claude: "2026-11-01" }

function peak(tokens: number, overrides: Partial<Peak> = {}): Peak {
	return { tokens, fromDay: "2026-11-20", cacheRead: 0, ...overrides }
}

function limit(tokens: number, overrides: Partial<Limit> = {}): Limit {
	return {
		tokens,
		low: Math.round(tokens * 0.9),
		high: Math.round(tokens * 1.1),
		points: 10,
		readings: 3,
		rough: false,
		...overrides,
	}
}

function plan(overrides: Partial<PlanPeak> = {}): PlanPeak {
	return {
		plan: "claude",
		tier: "Max",
		fiveHours: peak(100),
		sevenDays: peak(1_000),
		thirtyDays: peak(5_000),
		limits: null,
		measured: [],
		...overrides,
	}
}

describe("planBars unit", () => {
	test("draws the estimate's processed tokens in the with-cache unit", () => {
		const bars = planBars(
			[
				plan({
					limits: {
						fiveHours: null,
						sevenDays: limit(2_000, {
							processed: { value: 3_000, low: 2_700, high: 3_300 },
						}),
						thirtyDays: null,
					},
				}),
			],
			{ day: DAY, planSince: OLD, window: "sevenDays", unit: "processed" },
		)
		expect(bars[0]).toMatchObject({
			kind: "estimate",
			unit: "processed",
			tokens: 3_000,
			low: 2_700,
			high: 3_300,
		})
	})

	test("counts a most-we-used bar's cache reads in the with-cache unit", () => {
		const bars = planBars([plan({ sevenDays: peak(700, { cacheRead: 300 }) })], {
			day: DAY,
			planSince: OLD,
			window: "sevenDays",
			unit: "processed",
		})
		expect(bars[0]).toMatchObject({ kind: "fallback", unit: "processed", tokens: 1_000 })
	})

	test("draws the estimate's list dollars in the API $ unit", () => {
		const bars = planBars(
			[
				plan({
					limits: {
						fiveHours: null,
						sevenDays: limit(2_000, { usd: { value: 12.5, low: 11, high: 14 } }),
						thirtyDays: null,
					},
				}),
			],
			{ day: DAY, planSince: OLD, window: "sevenDays", unit: "usd" },
		)
		expect(bars[0]).toMatchObject({
			kind: "estimate",
			unit: "usd",
			tokens: 12.5,
			low: 11,
			high: 14,
		})
	})

	test("gives a measured-only plan no dollar bar", () => {
		const bars = planBars([plan({ sevenDays: peak(700) })], {
			day: DAY,
			planSince: OLD,
			window: "sevenDays",
			unit: "usd",
		})
		expect(bars[0]).toMatchObject({ kind: "none", unit: "usd", tokens: null })
	})

	test("gives a body cached before shape 5 no processed or dollar bar", () => {
		const limits = { fiveHours: null, sevenDays: limit(2_000), thirtyDays: null }
		const tokens = planBars([plan({ limits })], {
			day: DAY,
			planSince: OLD,
			window: "sevenDays",
		})
		const processed = planBars([plan({ limits })], {
			day: DAY,
			planSince: OLD,
			window: "sevenDays",
			unit: "processed",
		})
		const usd = planBars([plan({ limits })], {
			day: DAY,
			planSince: OLD,
			window: "sevenDays",
			unit: "usd",
		})
		expect(tokens[0]?.kind).toBe("estimate")
		expect(processed[0]).toMatchObject({ kind: "none", tokens: null })
		expect(usd[0]).toMatchObject({ kind: "none", tokens: null })
	})
})

describe("barAriaLabel unit", () => {
	test("names the with-cache unit", () => {
		const bars = planBars([plan()], {
			day: DAY,
			planSince: OLD,
			window: "sevenDays",
			unit: "processed",
		})
		expect(barAriaLabel(bars, "sevenDays")).toStartWith(
			"Bar chart of the tokens each plan gives a week, cache reads counted in full",
		)
	})

	test("names the dollar unit and writes dollars", () => {
		const bars = planBars(
			[
				plan({
					limits: {
						fiveHours: null,
						sevenDays: limit(2_000, { usd: { value: 12.5, low: 11, high: 14 } }),
						thirtyDays: null,
					},
				}),
			],
			{ day: DAY, planSince: OLD, window: "sevenDays", unit: "usd" },
		)
		expect(barAriaLabel(bars, "sevenDays")).toBe(
			"Bar chart of the API dollar value each plan gives a week, largest first. Claude: $12.50 of API value, estimated at 100%.",
		)
	})
})
