import { describe, expect, test } from "bun:test"
import type { ProjectionAllowances } from "../../contract"
import { inYear } from "../allowances/fixtures.test-support"
import { projectionRun } from "../compare/projection.test-support"
import { walkedYear } from "../tax/brackets.test-support"
import { taxFocusView } from "./focus"

/** A projection whose first year is the walked 2026 tax year, and the golden allowances read in it. */
const RUN = projectionRun({
	asOf: "2026-10-31",
	taxYears: [walkedYear({ owed: "99000.00" })],
})
const ALLOWANCES = inYear("2026-10-31")

describe("taxFocusView", () => {
	test("states the year's tax, its due date and the saving, and splits the bar by bracket", () => {
		const view = taxFocusView(RUN, ALLOWANCES, false)
		if (view === null) throw new Error("the walked year has brackets")
		expect(view.label).toContain("How much tax for 2026?")
		expect(view.label).toContain("due 31 Mar 2027.")
		expect(view.label).toContain("You could still save")
		expect(view.due).toBe("31 Mar 2027")
		expect(view.refund).toBe(false)
		expect(view.segments.length).toBeGreaterThan(1)
		expect(view.segments.at(-1)?.top).toBe(true)
		expect(view.segments.reduce((sum, one) => sum + one.share, 0)).toBeCloseTo(1, 10)
		expect(view.action?.href).toBe("/optimize/allowances/")
	})

	test("says a refund in words and drops the leading minus from the figure", () => {
		const run = projectionRun({
			asOf: "2026-10-31",
			taxYears: [walkedYear({ owed: "-17500.00" })],
		})
		const view = taxFocusView(run, null, false)
		expect(view?.refund).toBe(true)
		expect(view?.label).toContain("A refund of 17.5k THB")
		expect(view?.action).toBeUndefined()
	})

	test("offers Save tax only for a saving above zero, read from the CLI's string", () => {
		const saving = (value: string): ProjectionAllowances => {
			const data = structuredClone(ALLOWANCES)
			const year = data.taxYears[0]
			if (year === undefined) throw new Error("the golden has a tax year")
			year.saving = value
			return data
		}
		expect(taxFocusView(RUN, saving("0.00"), false)?.action).toBeUndefined()
		expect(taxFocusView(RUN, saving("0"), false)?.action).toBeUndefined()
		expect(taxFocusView(RUN, saving("-100.00"), false)?.action).toBeUndefined()
		expect(taxFocusView(RUN, saving("1.00"), false)?.action?.label).toBe("Save tax")
	})

	test("masks the tax and the saving together, and still offers the action", () => {
		const view = taxFocusView(RUN, ALLOWANCES, true)
		expect(view?.label).toContain("The amount is hidden.")
		expect(view?.label).toContain("You could still save an amount that is hidden.")
		expect(view?.action?.label).toBe("Save tax")
	})

	test("has no answer for a hand-written Levy, whose year states no brackets", () => {
		expect(taxFocusView(projectionRun({ taxYears: [] }), ALLOWANCES, false)).toBeNull()
	})
})
