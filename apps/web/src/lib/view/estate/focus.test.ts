import { describe, expect, test } from "bun:test"
import type { EstateFigures } from "./figures"
import { estateFocusView } from "./focus"
import type { EstateRow } from "./rows"

const ROW: EstateRow = {
	date: "2053-12-31",
	gross: "1000000.00",
	debts: "100000.00",
	costs: "50000.00",
	net: "850000.00",
	gifts: "50000.00",
	toHeirs: "800000.00",
	realNet: "0.00",
	realToHeirs: "0.00",
}

function figures(over: Partial<EstateRow> = {}, shortfall: string | null = null): EstateFigures {
	return {
		date: over.date ?? ROW.date,
		row: { ...ROW, ...over },
		currency: "THB",
		shortfall,
		items: [],
		costs: [],
		gifts: [],
	}
}

describe("estateFocusView", () => {
	test("states what heirs receive and the year, with a slice per deduction and the net at the end", () => {
		const view = estateFocusView(figures(), false)
		expect(view?.label).toBe("What would your heirs receive? 800k THB in 2053.")
		expect(view?.net).toBe("800000.00")
		expect(view?.year).toBe("2053")
		expect(view?.segments).toHaveLength(4)
		expect(view?.segments.map((one) => one.heirs)).toEqual([false, false, false, true])
		expect(view?.segments.reduce((sum, one) => sum + one.share, 0)).toBeCloseTo(1, 10)
	})

	test("says the amount is hidden with Hide amounts on", () => {
		expect(estateFocusView(figures(), true)?.label).toBe(
			"What would your heirs receive? The amount is hidden. In 2053.",
		)
	})

	test("has no answer for a short estate, which the page states in its own alert", () => {
		expect(estateFocusView(figures({ net: "-20000.00" }, "20000.00"), false)).toBeNull()
	})

	test("has no answer when a line is negative, so it never draws a slice it cannot place", () => {
		expect(estateFocusView(figures({ debts: "-1.00" }), false)).toBeNull()
	})
})
