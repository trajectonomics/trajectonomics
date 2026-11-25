import { describe, expect, test } from "bun:test"
import { healthReport } from "../src/core/health"
import { affectedDays } from "../src/core/rollup"
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

describe("healthReport", () => {
	test("reports stale when no ingest ever arrived", () => {
		expect(healthReport(null, Date.parse("2026-11-25T12:00:00.000Z"))).toEqual({
			lastIngestAt: null,
			minutesSinceIngest: null,
			stale: true,
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
