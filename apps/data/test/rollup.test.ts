import { describe, expect, test } from "bun:test"
import { healthReport } from "../src/core/health"
import { affectedDays, dayBounds } from "../src/core/rollup"
import { usageRow } from "./support/fixtures"

describe("affectedDays", () => {
	test("returns each touched UTC day once, sorted", () => {
		expect(
			affectedDays([
				usageRow({ hourUtc: "2026-11-25T00:00:00.000Z" }),
				usageRow({ hourUtc: "2026-11-24T23:00:00.000Z" }),
				usageRow({ hourUtc: "2026-11-24T00:00:00.000Z" }),
			]),
		).toEqual(["2026-11-24", "2026-11-25"])
	})
})

describe("dayBounds", () => {
	test("returns canonical hourUtc bounds for one UTC day", () => {
		expect(dayBounds("2026-11-24")).toEqual({
			start: "2026-11-24T00:00:00.000Z",
			end: "2026-11-25T00:00:00.000Z",
		})
		expect(dayBounds("2026-11-24").start).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/)
	})

	test("rolls over a month, a year and a leap day", () => {
		expect(dayBounds("2026-11-30").end).toBe("2026-12-01T00:00:00.000Z")
		expect(dayBounds("2026-12-31").end).toBe("2027-01-01T00:00:00.000Z")
		expect(dayBounds("2028-02-28").end).toBe("2028-02-29T00:00:00.000Z")
	})
})

describe("healthReport", () => {
	test("reports stale when no ingest ever arrived", () => {
		expect(healthReport(null, Date.parse("2026-11-25T12:00:00.000Z"))).toEqual({
			lastIngestAt: null,
			minutesSinceIngest: null,
			stale: true,
			collectingSince: null,
			planSince: {},
		})
	})

	test("carries the first collected day, globally and per plan", () => {
		expect(
			healthReport("2026-11-25T09:01:00.000Z", Date.parse("2026-11-25T12:00:00.000Z"), {
				collectingSince: "2026-11-24",
				planSince: { claude: "2026-11-24", cursor: "2026-11-25" },
			}),
		).toEqual({
			lastIngestAt: "2026-11-25T09:01:00.000Z",
			minutesSinceIngest: 179,
			stale: false,
			collectingSince: "2026-11-24",
			planSince: { claude: "2026-11-24", cursor: "2026-11-25" },
		})
	})

	test("is fresh within three hours and stale past it", () => {
		const now = Date.parse("2026-11-25T12:00:00.000Z")
		expect(healthReport("2026-11-25T09:01:00.000Z", now).stale).toBe(false)
		expect(healthReport("2026-11-25T08:59:00.000Z", now).stale).toBe(true)
	})

	test("clamps a clock skew to zero minutes", () => {
		expect(
			healthReport("2026-11-25T12:05:00.000Z", Date.parse("2026-11-25T12:00:00.000Z"))
				.minutesSinceIngest,
		).toBe(0)
	})
})
