import { describe, expect, test } from "bun:test"
import { PEAK_COLUMNS, type PeakColumn } from "./peak-words"
import { limitCell, limitRange, limitShare } from "./plan-limits"
import { limitsOf, peakTableRows } from "./plan-peaks"
import type { Limit, Peak, PlanPeak } from "./types"

const DAY = "2026-11-27"
const FIVE_HOURS = PEAK_COLUMNS[0] as PeakColumn
const THIRTY_DAYS = PEAK_COLUMNS[2] as PeakColumn

function limit(overrides: Partial<Limit> = {}): Limit {
	return {
		tokens: 13_800_000,
		low: 12_900_000,
		high: 14_700_000,
		points: 18,
		readings: 4,
		rough: false,
		...overrides,
	}
}

function peak(tokens: number): Peak {
	return { tokens, fromDay: "2026-11-24", cacheRead: 0 }
}

describe("limitCell", () => {
	test("has no cell when the window has no meter estimate", () => {
		expect(limitCell(null, FIVE_HOURS, 1_000, null)).toBeNull()
		expect(limitCell(undefined, FIVE_HOURS, 1_000, null)).toBeNull()
	})

	test("shows the estimated 100%, its range, and the bar against it", () => {
		const cell = limitCell(limit(), FIVE_HOURS, 2_064_731, null)
		expect(cell).toMatchObject({
			figure: "≈ 13.8M at 100%",
			meta: "13–15M · from the meter",
			share: 15,
		})
		expect(cell?.spoken).toBe(
			"About 13,800,000 tokens at 100% of the 5-hour limit, between 12,900,000 and 14,700,000, from 18 percentage points of meter readings",
		)
	})

	test("keeps a rough estimate's layout and says it is rough", () => {
		const cell = limitCell(limit({ points: 2, rough: true }), FIVE_HOURS, null, null)
		expect(cell?.figure).toBe("≈ 13.8M at 100%")
		expect(cell?.share).toBe(0)
		expect(cell?.meta).toBe("rough · 13–15M · from the meter")
		expect(cell?.spoken).toBe(
			"Rough estimate: About 13,800,000 tokens at 100% of the 5-hour limit, between 12,900,000 and 14,700,000, from 2 percentage points of meter readings",
		)
	})

	test("says at least when there is no upper bound yet", () => {
		const unbounded = limit({ low: 69_000_000, high: null })
		expect(limitRange(unbounded)).toBe("≥ 69M")
		expect(limitCell(unbounded, FIVE_HOURS, null, null)?.spoken).toContain("at least 69,000,000")
	})

	test("keeps the estimate while its window still fills and notes the days seen", () => {
		const collecting = { seen: 3, of: 7, note: null }
		const cell = limitCell(limit(), FIVE_HOURS, 1_000, collecting)
		expect(cell?.collecting).toEqual(collecting)
		expect(cell?.figure).toBe("≈ 13.8M at 100%")
	})

	test("names a derived month", () => {
		const cell = limitCell(limit({ derived: true }), THIRTY_DAYS, null, null)
		expect(cell?.meta).toBe("13–15M · week × 30/7 · from the meter")
		expect(cell?.spoken).toContain(", the week × 30/7,")
	})

	test("caps the bar at a full limit", () => {
		expect(limitShare(20_000_000, limit())).toBe(100)
		expect(limitShare(null, limit())).toBe(0)
		expect(limitShare(1_000, limit({ tokens: 0 }))).toBe(0)
	})
})

describe("limitsOf", () => {
	const limits = { fiveHours: limit(), sevenDays: null, thirtyDays: null }

	function claude(overrides: Partial<PlanPeak> = {}): PlanPeak {
		return {
			plan: "claude",
			tier: "Max",
			fiveHours: peak(100),
			sevenDays: peak(1_000),
			thirtyDays: peak(10_000),
			limits,
			measured: [
				{
					tier: "Max",
					fiveHours: peak(100),
					sevenDays: peak(1_000),
					thirtyDays: peak(10_000),
					limits,
				},
				{
					tier: "Pro",
					fiveHours: peak(10),
					sevenDays: peak(100),
					thirtyDays: peak(1_000),
					limits: null,
				},
				{ tier: "Free", fiveHours: peak(1), sevenDays: peak(10), thirtyDays: peak(100) },
			],
			...overrides,
		}
	}

	function rowOf(entry: PlanPeak) {
		const row = peakTableRows([], [entry], DAY)[0]
		if (row === undefined) throw new Error("no row")
		return row
	}

	test("gives the current tier its plan estimates", () => {
		const row = rowOf(claude())
		expect(row.limits).toEqual(limits)
		expect(limitsOf(row, "Max")).toEqual(limits)
	})

	test("gives another tier none", () => {
		const row = rowOf(claude())
		expect(limitsOf(row, "Pro")).toBeNull()
		expect(limitsOf(row, "Free")).toBeNull()
	})

	test("renders a body cached before limits without one", () => {
		const old = {
			plan: "claude",
			tier: "Max",
			fiveHours: peak(100),
			sevenDays: peak(1_000),
			thirtyDays: peak(10_000),
			measured: [
				{ tier: "Max", fiveHours: peak(100), sevenDays: peak(1_000), thirtyDays: peak(10_000) },
			],
		} as unknown as PlanPeak
		const row = rowOf(old)
		expect(row.limits).toBeNull()
		expect(limitsOf(row, "Max")).toBeNull()
	})
})
