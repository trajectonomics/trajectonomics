import { describe, expect, test } from "bun:test"
import { ok, projectionRun } from "../../lib/view/compare/projection.test-support"
import { panel, withLevy, year } from "./tax-panel.test-support"

describe("TaxPanel: the chart and the Carry-in", () => {
	test("the chart is drawn for three years and not for two", () => {
		const three = [year(), year({ from: "2027-01-01" }), year({ from: "2028-01-01" })]
		expect(panel({ base: ok(projectionRun({ taxYears: three })) })).toContain(
			'id="tax-chart-title"',
		)
		expect(panel({ base: ok(withLevy) })).not.toContain('id="tax-chart-title"')
	})

	test("carry-in records the result echoes appear as a small table", () => {
		const carryIn = [
			{
				levy: "th-2026-pit",
				periodStart: "2026-01-01",
				tallies: [{ label: "income.section40_1", basis: "gross" as const, amount: "850000.00" }],
				prepaid: "0.00",
				source: "flag" as const,
			},
		]
		const body = panel({ base: ok(projectionRun({ taxYears: [year()], carryIn })) })
		expect(body).toContain("Carry-in records")
		expect(body).toContain("income.section40_1")
	})
})
