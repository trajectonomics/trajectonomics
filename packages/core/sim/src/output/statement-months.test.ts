import { describe, expect, it } from "bun:test"
import { statementMonths } from "./statement-months"

describe("statement months", () => {
	// The start is its own one-day month, the middle months are whole, and the last month is cut
	// by the horizon, so it is partial.
	it("cuts the first and last month at the start and at the horizon", () => {
		expect(statementMonths("2025-12-31", "2026-02-15", undefined)).toEqual([
			{ from: "2025-12-31", to: "2025-12-31", partial: true },
			{ from: "2026-01-01", to: "2026-01-31", partial: false },
			{ from: "2026-02-01", to: "2026-02-15", partial: true },
		])
	})

	it("marks a month that a run-out ends as partial, even on a month end", () => {
		expect(statementMonths("2026-01-01", "2026-02-28", "2026-02-28")).toEqual([
			{ from: "2026-01-01", to: "2026-01-31", partial: false },
			{ from: "2026-02-01", to: "2026-02-28", partial: true },
		])
	})

	it("ends a whole month on its last day, with no partial month", () => {
		expect(
			statementMonths("2026-01-01", "2026-03-31", undefined).map((item) => item.partial),
		).toEqual([false, false, false])
	})
})
