import { describe, expect, test } from "bun:test"
import { barAriaLabel } from "./bar-words"
import { planBars } from "./plan-bars"
import type { Limit, Peak, PlanPeak } from "./types"

const DAY = "2026-11-27"
const OLD = { claude: "2026-11-01" }
const RECENT = { claude: "2026-11-25" }

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

describe("planBars", () => {
	test("uses the meter's estimated 100% as the bar's value", () => {
		const bars = planBars(
			[
				plan({
					limits: {
						fiveHours: null,
						sevenDays: limit(2_000),
						thirtyDays: null,
					},
				}),
			],
			{ day: DAY, planSince: OLD, window: "sevenDays" },
		)
		expect(bars[0]).toMatchObject({
			kind: "estimate",
			unit: "tokens",
			tokens: 2_000,
			low: 1_800,
			high: 2_200,
			rough: false,
		})
	})

	test("falls back to the most we used when the plan has no meter estimate", () => {
		const bars = planBars([plan()], { day: DAY, planSince: OLD, window: "sevenDays" })
		expect(bars[0]).toMatchObject({ kind: "fallback", tokens: 1_000 })
	})

	test("keeps the estimate while its window still fills", () => {
		const bars = planBars(
			[plan({ limits: { fiveHours: null, sevenDays: limit(2_000), thirtyDays: null } })],
			{ day: DAY, planSince: RECENT, window: "sevenDays" },
		)
		expect(bars[0]?.kind).toBe("estimate")
	})

	test("draws a stub while a window without an estimate still fills", () => {
		const bars = planBars([plan()], { day: DAY, planSince: RECENT, window: "sevenDays" })
		expect(bars[0]).toMatchObject({
			kind: "collecting",
			tokens: null,
			collecting: { seen: 3, of: 7 },
		})
	})

	test("derives Claude's 30-day bar from its week", () => {
		const bars = planBars([plan({ sevenDays: peak(700), thirtyDays: null })], {
			day: DAY,
			planSince: OLD,
			window: "thirtyDays",
		})
		expect(bars[0]).toMatchObject({ kind: "fallback", tokens: 3_000, derived: true })
	})

	test("sorts the largest first and a waiting window last", () => {
		const bars = planBars(
			[
				plan(),
				plan({
					plan: "cursor",
					tier: "Premium",
					sevenDays: peak(9_000),
				}),
				plan({ plan: "opencode-go", tier: "Go", sevenDays: peak(500), limits: null }),
			],
			{ day: DAY, planSince: RECENT, window: "sevenDays" },
		)
		expect(bars.map((bar) => bar.kind)).toEqual(["fallback", "fallback", "collecting"])
		expect(bars[0]?.plan).toBe("cursor")
	})

	test("has no bar draw when the window reports nothing", () => {
		const bars = planBars([plan({ sevenDays: null })], {
			day: DAY,
			planSince: OLD,
			window: "sevenDays",
		})
		expect(bars[0]).toMatchObject({ kind: "none", tokens: null })
	})
})

describe("barAriaLabel", () => {
	test("names every plan, its figure and how it was made", () => {
		const bars = planBars([plan()], { day: DAY, planSince: OLD, window: "sevenDays" })
		expect(barAriaLabel(bars, "sevenDays")).toBe(
			"Bar chart of the tokens each plan gives a week, largest first. Claude: 1,000 tokens, most we used.",
		)
	})
})
