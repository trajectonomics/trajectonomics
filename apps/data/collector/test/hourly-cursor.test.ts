import { describe, expect, test } from "bun:test"
import { cursorPath, latestUsageHour, sinceForCursor } from "../src/hourly/cursor"
import { quotaRow, usageRow } from "./support/rows"

const NOW = Date.parse("2026-11-27T14:26:00.000Z")

describe("sinceForCursor", () => {
	test("starts at the current hour when a host has no cursor", () => {
		expect(sinceForCursor(null, NOW)).toBe("2026-11-27T14:00:00.000Z")
	})

	test("starts at midnight when the clock is inside the first hour of a day", () => {
		expect(sinceForCursor(null, Date.parse("2026-11-27T00:09:59.000Z"))).toBe(
			"2026-11-27T00:00:00.000Z",
		)
	})

	test("reads six hours before the cursor", () => {
		expect(sinceForCursor("2026-11-27T10:00:00.000Z", NOW)).toBe("2026-11-27T04:00:00.000Z")
	})

	test("rejects a cursor that is not a timestamp", () => {
		expect(() => sinceForCursor("yesterday", NOW)).toThrow("cursor is not an ISO timestamp")
	})
})

describe("latestUsageHour", () => {
	test("returns the latest usage hour and ignores quota rows", () => {
		const rows = [
			usageRow({ hourUtc: "2026-11-27T09:00:00.000Z" }),
			usageRow({ hourUtc: "2026-11-27T11:00:00.000Z" }),
			quotaRow({ sampledAt: "2026-11-27T12:00:00.000Z" }),
		]
		expect(latestUsageHour(rows)).toBe("2026-11-27T11:00:00.000Z")
	})

	test("returns null when a host sent no usage", () => {
		expect(latestUsageHour([quotaRow()])).toBeNull()
		expect(latestUsageHour([])).toBeNull()
	})
})

describe("cursorPath", () => {
	test("names one cursor file per host", () => {
		expect(cursorPath("/synthetic/state", "alpha")).toBe("/synthetic/state/cursor-alpha")
	})
})
