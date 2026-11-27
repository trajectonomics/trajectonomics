import { describe, expect, test } from "bun:test"
import {
	collectingLabel,
	daysCollected,
	daysFromCollection,
	PEAK_WINDOW_DAYS,
	peakCellChoice,
	shortDay,
	windowCoverage,
} from "./collecting"

const SINCE = "2026-11-27"

describe("daysCollected", () => {
	test("counts the first day as day one", () => {
		expect(daysCollected(SINCE, "2026-11-27")).toBe(1)
	})

	test("counts a full week on its seventh day", () => {
		expect(daysCollected(SINCE, "2026-12-03")).toBe(7)
	})

	test("counts a full month and the day after", () => {
		expect(daysCollected(SINCE, "2026-12-27")).toBe(31)
	})
})

describe("windowCoverage", () => {
	test("treats an unknown first day as a complete window", () => {
		expect(windowCoverage(undefined, "2026-11-27", 7)).toEqual({
			complete: true,
			seen: 7,
			of: 7,
		})
	})

	test("shows how many days a filling window has seen", () => {
		expect(windowCoverage(SINCE, "2026-11-27", 7)).toEqual({
			complete: false,
			seen: 1,
			of: 7,
		})
		expect(windowCoverage(SINCE, "2026-11-29", 30)).toEqual({
			complete: false,
			seen: 3,
			of: 30,
		})
	})

	test("completes on the window's last day, not after it", () => {
		expect(windowCoverage(SINCE, "2026-12-03", 7).complete).toBe(true)
		expect(windowCoverage(SINCE, "2026-12-25", 30).complete).toBe(false)
		expect(windowCoverage(SINCE, "2026-12-26", 30).complete).toBe(true)
	})

	test("clamps a day before collection to none seen", () => {
		expect(windowCoverage(SINCE, "2026-11-26", 7)).toEqual({
			complete: false,
			seen: 0,
			of: 7,
		})
	})
})

describe("peakCellChoice", () => {
	test("keeps the five-hour figure on the first day", () => {
		expect(peakCellChoice("fiveHours", true, SINCE, SINCE, true)).toEqual({ kind: "figure" })
	})

	test("holds the week figure back until seven days are collected", () => {
		expect(peakCellChoice("sevenDays", true, SINCE, "2026-11-29", false)).toEqual({
			kind: "collecting",
			seen: 3,
			of: 7,
			note: null,
		})
		expect(peakCellChoice("sevenDays", true, SINCE, "2026-12-03", false)).toEqual({
			kind: "figure",
		})
	})

	test("holds a stated month back until thirty days are collected", () => {
		expect(peakCellChoice("thirtyDays", true, SINCE, "2026-12-03", false)).toEqual({
			kind: "collecting",
			seen: 7,
			of: 30,
			note: null,
		})
		expect(peakCellChoice("thirtyDays", true, SINCE, "2026-12-27", false)).toEqual({
			kind: "figure",
		})
	})

	test("holds the derived month back until its week is complete, then shows it", () => {
		expect(peakCellChoice("thirtyDays", true, SINCE, "2026-11-29", true)).toEqual({
			kind: "collecting",
			seen: 3,
			of: 7,
			note: "week × 30/7 after 7 days",
		})
		expect(peakCellChoice("thirtyDays", true, SINCE, "2026-12-03", true)).toEqual({
			kind: "figure",
		})
	})

	test("keeps a dash as a dash", () => {
		expect(peakCellChoice("sevenDays", false, SINCE, "2026-11-29", false)).toEqual({
			kind: "figure",
		})
	})

	test("keeps every figure when the first day is unknown", () => {
		expect(peakCellChoice("sevenDays", true, undefined, "2026-11-29", false)).toEqual({
			kind: "figure",
		})
	})

	test("names the windows' full lengths", () => {
		expect(PEAK_WINDOW_DAYS).toEqual({ fiveHours: 1, sevenDays: 7, thirtyDays: 30 })
	})
})

describe("daysFromCollection", () => {
	const days = ["2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27"]

	test("drops the days before collection starts", () => {
		expect(daysFromCollection("2026-11-27", days)).toEqual(["2026-11-27"])
	})

	test("keeps every day of an old health body", () => {
		expect(daysFromCollection(null, days)).toEqual(days)
		expect(daysFromCollection(undefined, days)).toEqual(days)
	})
})

describe("the collecting note", () => {
	test("writes the day without its year", () => {
		expect(shortDay("2026-11-27")).toBe("27 Nov")
		expect(shortDay("2026-12-01")).toBe("1 Dec")
		expect(shortDay("not-a-day")).toBe("not-a-day")
	})

	test("names the first day and the current one", () => {
		expect(collectingLabel("2026-11-27", "2026-11-27")).toBe("Collecting since 27 Nov · day 1")
		expect(collectingLabel("2026-11-27", "2026-11-29")).toBe("Collecting since 27 Nov · day 3")
	})

	test("is absent when the first day is unknown", () => {
		expect(collectingLabel(null, "2026-11-29")).toBeNull()
		expect(collectingLabel(undefined, "2026-11-29")).toBeNull()
	})

	test("is absent when the day in view is before collection", () => {
		expect(collectingLabel("2026-11-27", "2026-11-26")).toBeNull()
	})
})
