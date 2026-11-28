import { describe, expect, it } from "bun:test"
import { nextConsentUpdatedAt } from "./consent-write"

const NOW = new Date("2026-11-28T00:00:00.000Z")

describe("nextConsentUpdatedAt", () => {
	it("stamps one millisecond later when the clock equals the value it read", () => {
		expect(nextConsentUpdatedAt(NOW, NOW).toISOString()).toBe("2026-11-28T00:00:00.001Z")
		expect(nextConsentUpdatedAt(NOW, NOW.toISOString()).toISOString()).toBe(
			"2026-11-28T00:00:00.001Z",
		)
	})

	it("keeps the clock when it is already later than the value it read", () => {
		const previous = "2026-11-27T00:00:00.000Z"
		expect(nextConsentUpdatedAt(NOW, previous)).toEqual(NOW)
	})

	it("moves past the latest of several values", () => {
		const previous = ["2026-11-27T00:00:00.000Z", "2026-11-29T00:00:00.000Z"]
		expect(nextConsentUpdatedAt(NOW, ...previous).toISOString()).toBe("2026-11-29T00:00:00.001Z")
	})

	it("uses the clock when there is no readable previous value", () => {
		expect(nextConsentUpdatedAt(NOW)).toEqual(NOW)
		expect(nextConsentUpdatedAt(NOW, undefined, null, "", "not-a-date")).toEqual(NOW)
	})
})
