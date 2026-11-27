import { describe, expect, test } from "bun:test"
import { PEAK_COLUMNS, peakCacheShare, peakNote, peakSpoken } from "./peak-words"
import { measuredOf, peakColumnMax, peakOf, peakShare, peakTableRows } from "./plan-peaks"
import type { Peak, PlanPeak } from "./types"

const DAY = "2026-11-27"

function peak(tokens: number, fromDay = "2026-11-24", cacheRead: number | null = null): Peak {
	return { tokens, fromDay, cacheRead }
}

function plan(planId: string, overrides: Partial<Omit<PlanPeak, "plan">> = {}): PlanPeak {
	return {
		plan: planId,
		tier: null,
		fiveHours: peak(100),
		sevenDays: peak(1_000),
		thirtyDays: peak(10_000),
		measured: [],
		...overrides,
	}
}

describe("peakTableRows", () => {
	test("follows the summary's ranked order", () => {
		const rows = peakTableRows(
			[{ plan: "cursor" }, { plan: "claude" }],
			[plan("claude"), plan("cursor")],
			DAY,
		)
		expect(rows.map((row) => row.plan)).toEqual(["cursor", "claude"])
		expect(rows.map((row) => row.planName)).toEqual(["Cursor", "Claude"])
	})

	test("adds a plan with peaks but no use in the window, in the plan table's order", () => {
		const rows = peakTableRows(
			[{ plan: "claude" }],
			[plan("mistral"), plan("claude"), plan("opencode-go")],
			DAY,
		)
		expect(rows.map((row) => row.plan)).toEqual(["claude", "opencode-go", "mistral"])
	})

	test("does not repeat a plan the summary already ranks", () => {
		const rows = peakTableRows([{ plan: "claude" }, { plan: "claude" }], [plan("claude")], DAY)
		expect(rows).toHaveLength(1)
	})

	test("takes the tier at the window's end and drops a null peak", () => {
		const rows = peakTableRows(
			[{ plan: "mistral" }],
			[
				plan("mistral", {
					fiveHours: null,
					sevenDays: peak(700),
					thirtyDays: peak(1_200),
				}),
			],
			DAY,
		)
		expect(rows[0]).toMatchObject({
			planName: "Mistral",
			tier: { name: "Pro", note: "Cancelled; last used 2026-11-21" },
			fiveHours: null,
			sevenDays: peak(700),
		})
	})
})

function findRow(rows: ReturnType<typeof peakTableRows>, planId: string) {
	const row = rows.find((entry) => entry.plan === planId)
	if (row === undefined) throw new Error(`no row for ${planId}`)
	return row
}

describe("the peaks table's figures", () => {
	const rows = peakTableRows(
		[],
		[
			plan("claude", { fiveHours: peak(300) }),
			plan("cursor", { fiveHours: peak(150) }),
			plan("mistral", { fiveHours: null, sevenDays: peak(900) }),
		],
		DAY,
	)

	test("draws every bar against the column's largest figure", () => {
		const max = peakColumnMax(rows, "fiveHours")
		expect(max).toBe(300)
		expect(peakShare(peakOf(findRow(rows, "claude"), "fiveHours"), max)).toBe(100)
		expect(peakShare(peakOf(findRow(rows, "cursor"), "fiveHours"), max)).toBe(50)
		expect(peakShare(peakOf(findRow(rows, "mistral"), "fiveHours"), max)).toBe(0)
	})

	test("measures the week column on its own figures", () => {
		expect(peakColumnMax(rows, "sevenDays")).toBe(1_000)
		expect(peakColumnMax(rows, "thirtyDays")).toBe(10_000)
	})

	test("hides the five-hour bar of a daily-only plan", () => {
		expect(peakOf(findRow(rows, "mistral"), "fiveHours")).toBeNull()
		expect(peakShare(null, 300)).toBe(0)
		expect(peakShare(peak(0), 0)).toBe(0)
	})
})

describe("peakSpoken", () => {
	test("spells out the figure with its window and start day", () => {
		expect(peakSpoken(peak(2_300_000_000), PEAK_COLUMNS[0] as (typeof PEAK_COLUMNS)[number])).toBe(
			"2,300,000,000 tokens in 5 hours, from 2026-11-24",
		)
		expect(peakSpoken(peak(5), PEAK_COLUMNS[2] as (typeof PEAK_COLUMNS)[number])).toBe(
			"5 tokens in 30 days, from 2026-11-24",
		)
	})

	test("names the cache reads it counted apart", () => {
		expect(peakCacheShare(peak(100, "2026-11-24", 900))).toBe(0.9)
		expect(peakNote(peak(100, "2026-11-24", 900), "fiveHours")).toBe("90% cache reads")
		expect(
			peakSpoken(peak(100, "2026-11-24", 900), PEAK_COLUMNS[0] as (typeof PEAK_COLUMNS)[number]),
		).toBe("100 tokens in 5 hours, from 2026-11-24, 90% cache reads")
	})
})

describe("a derived month", () => {
	test("scales Claude's week to 30 days and says so instead of a start day", () => {
		const rows = peakTableRows(
			[],
			[plan("claude", { sevenDays: peak(700), thirtyDays: null })],
			DAY,
		)
		const month = peakOf(findRow(rows, "claude"), "thirtyDays")
		expect(month).toEqual({ tokens: 3_000, fromDay: "2026-11-24", cacheRead: null, derived: true })
		expect(peakNote(month as Peak, "thirtyDays")).toBe("week × 30/7")
		expect(peakSpoken(month as Peak, PEAK_COLUMNS[2] as (typeof PEAK_COLUMNS)[number])).toBe(
			"3,000 tokens in 30 days, the week × 30/7",
		)
	})

	test("keeps a stated monthly window for another plan", () => {
		const rows = peakTableRows([], [plan("mistral", { thirtyDays: peak(900) })], DAY)
		expect(peakOf(findRow(rows, "mistral"), "thirtyDays")).toEqual(peak(900))
	})
})

describe("an old-shape body", () => {
	test("renders a body cached before cache reads without a cache line", () => {
		const old = {
			plan: "mistral",
			tier: "Pro",
			fiveHours: null,
			sevenDays: { tokens: 700, fromDay: "2026-11-20" },
			thirtyDays: { tokens: 1_200, fromDay: "2026-11-20" },
		} as unknown as PlanPeak
		const rows = peakTableRows([], [old], DAY)
		const week = peakOf(findRow(rows, "mistral"), "sevenDays") as Peak
		expect(peakCacheShare(week)).toBeNull()
		expect(peakNote(week, "sevenDays")).toBeNull()
		expect(peakSpoken(week, PEAK_COLUMNS[1] as (typeof PEAK_COLUMNS)[number])).toBe(
			"700 tokens in 7 days, from 2026-11-20",
		)
	})
})

describe("measuredOf", () => {
	test("stands the plan's own figures in for a body cached before measured existed", () => {
		const peak = { tokens: 10, fromDay: "2026-11-20" }
		const old = { plan: "claude", tier: "Max", fiveHours: peak, sevenDays: peak, thirtyDays: null }
		expect(measuredOf(old as unknown as PlanPeak)).toEqual([
			{ tier: "Max", fiveHours: peak, sevenDays: peak, thirtyDays: null },
		])
	})

	test("keeps the measured tiers when the body has them", () => {
		const measured = [{ tier: "Pro", fiveHours: null, sevenDays: null, thirtyDays: null }]
		const entry = {
			plan: "claude",
			tier: "Max",
			fiveHours: null,
			sevenDays: null,
			thirtyDays: null,
			measured,
		}
		expect(measuredOf(entry)).toBe(measured)
	})
})
