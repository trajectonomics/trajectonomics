import { describe, expect, test } from "bun:test"
import { projectionRun, taxYear } from "./projection-fixtures.test-support"
import { taxView } from "./tax"

describe("taxView", () => {
	test("reads the first settlement period: what is owed, its period and its settlement", () => {
		const view = taxView(
			projectionRun({
				taxYears: [
					taxYear("2026-01-01", "2026-12-31", "89000.00"),
					taxYear("2027-01-01", "2027-12-31", "1.00"),
				],
			}),
		)
		expect(view.currency).toBe("THB")
		expect(view.first).toEqual({
			levy: "th-2026-pit",
			owed: "89000.00",
			period: "1 Jan 2026 to 31 Dec 2026",
			settlement: "31 Mar 2027",
			settled: true,
			partial: false,
		})
	})

	test.each([
		["applied", "Tax applied"],
		["mixed", "Tax mixed"],
		["not_applied", "Tax not applied"],
	] as const)("words the %s status as %s", (tax, label) => {
		expect(taxView(projectionRun({ tax })).status).toBe(label)
	})

	test("has no first period when the Scenario has no Levy", () => {
		const view = taxView(projectionRun({ tax: "not_applied", taxYears: [] }))
		expect(view.first).toBeNull()
		expect(view.status).toBe("Tax not applied")
	})
})
