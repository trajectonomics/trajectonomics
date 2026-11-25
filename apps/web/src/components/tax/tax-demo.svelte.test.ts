import { describe, expect, test } from "bun:test"
import { demoSnapshotText } from "../../../scripts/demo-snapshot"
import { snapshot as snapshotSchema } from "../../lib/contract"
import { snapshotPeople } from "../../lib/view/item-names"
import { panel } from "./tax-panel.test-support"

const DEMO = snapshotSchema.parse(JSON.parse(await demoSnapshotText()))

// The Demo is generated at build (ADR 0021), so this reads what the CLI states for its taxed plan today.
describe("the Tax page, rendered from the Demo snapshot", () => {
	test("shows the walk, the brackets with a top rate, the chart and the table for the taxed plan", () => {
		const body = panel(DEMO.reads.projections)
		for (const text of [
			"From income to taxable income",
			"Your top rate",
			"Taxable income by bracket",
			"Income, tax and rates by tax year",
			"Lower it with allowances",
		]) {
			expect(body).toContain(text)
		}
		expect(body).not.toContain("undefined")
		expect(body).not.toContain("NaN")
	})

	test("the separate-filing plan switches between two Returns, each named by the household's role", () => {
		const body = panel(
			DEMO.reads.projections,
			"separate",
			snapshotPeople(DEMO, DEMO.params.scenarios),
		)
		expect(body).toContain('name="return"')
		expect(body).toContain(">You<")
		expect(body).toContain(">Your partner<")
		expect(body).toContain("th-2026-pit@me")
		// The headline names the Return on screen; the projection's notes still name both Levies.
		expect(body).not.toContain("th-2026-pit@partner, ")
	})
})
