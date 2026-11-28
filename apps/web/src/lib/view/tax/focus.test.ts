import { describe, expect, test } from "bun:test"
import type { ProjectionAllowances } from "../../contract"
import { inYear } from "../allowances/fixtures.test-support"
import { projectionRun } from "../compare/projection.test-support"
import { plainYear, schedule, walkedYear } from "./brackets.test-support"
import { taxFocusView } from "./focus"

/** A projection whose first year is the walked 2026 tax year, and the golden allowances read in it. */
const RUN = projectionRun({
	asOf: "2026-10-31",
	taxYears: [walkedYear({ owed: "99000.00" })],
})
const ALLOWANCES = inYear("2026-10-31")

/** The golden as a separate filing read: one tax year per Filer, each with its own saving. */
function separate(savings: readonly [string, string]): ProjectionAllowances {
	const data = structuredClone(ALLOWANCES)
	const year = data.taxYears[0]
	if (year === undefined) throw new Error("the golden has a tax year")
	data.taxYears = [
		{ ...year, filer: "me", levy: "th-2026-pit@me", saving: savings[0] },
		{ ...year, filer: "partner", levy: "th-2026-pit@partner", saving: savings[1] },
	]
	return data
}

const SEPARATE_RUN = projectionRun({
	asOf: "2026-10-31",
	taxYears: [
		walkedYear({ filer: "me", levy: "th-2026-pit@me", owed: "90000.00" }),
		walkedYear({ filer: "partner", levy: "th-2026-pit@partner", owed: "4600.00" }),
	],
})

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
		expect(view.emptyBar).toBe(false)
		expect(view.action?.href).toBe("/optimize/allowances/")
	})

	test("follows the Return it is given, its year and its saving", () => {
		const allowances = separate(["1000.00", "0.00"])
		const me = taxFocusView(SEPARATE_RUN, allowances, false, "me")
		const partner = taxFocusView(SEPARATE_RUN, allowances, false, "partner")
		expect(me?.label).toContain("90k THB")
		expect(me?.saving).toBe("1000.00")
		expect(me?.action?.label).toBe("Save tax")
		expect(partner?.label).toContain("4.6k THB")
		expect(partner?.label).not.toContain("You could still save")
		expect(partner?.saving).toBeNull()
		expect(partner?.action).toBeUndefined()
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
		expect(taxFocusView(RUN, saving("1.00"), false)?.saving).toBe("1.00")
	})

	test("masks the tax and the saving together, and still offers the action", () => {
		const view = taxFocusView(RUN, ALLOWANCES, true)
		expect(view?.label).toContain("The amount is hidden.")
		expect(view?.label).toContain("You could still save an amount that is hidden.")
		expect(view?.action?.label).toBe("Save tax")
		expect(view?.saving).toBe("28100.00")
	})

	test("states a hand-written Levy's tax with a baseline instead of no focus point", () => {
		const run = projectionRun({ taxYears: [plainYear({ owed: "17500.00" })] })
		const view = taxFocusView(run, ALLOWANCES, false)
		expect(view?.label).toBe(
			"How much tax for 2026? 17.5k THB due 31 Mar 2027. You could still save 28.1k THB.",
		)
		expect(view?.segments).toEqual([])
		expect(view?.emptyBar).toBe(true)
	})

	test("keeps a zero-income year's bar as a baseline rather than a blank", () => {
		const run = projectionRun({ taxYears: [walkedYear({ brackets: schedule([]) })] })
		const view = taxFocusView(run, null, false)
		expect(view?.segments.length).toBeGreaterThan(0)
		expect(view?.emptyBar).toBe(true)
	})

	test("has no answer for a run with no tax rules", () => {
		expect(
			taxFocusView(projectionRun({ tax: "not_applied", taxYears: [] }), ALLOWANCES, false),
		).toBeNull()
	})
})
