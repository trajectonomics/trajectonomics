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
	realNet: "850000.00",
	realToHeirs: "650000.00",
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

describe("estateFocusView under future money", () => {
	test("states what heirs receive and the year, with a named slice per deduction and the net at the end", () => {
		const view = estateFocusView(figures(), "nominal", false)
		expect(view?.label).toBe("What would your heirs receive? 800k THB in 2053.")
		expect(view?.net).toBe("800000.00")
		expect(view?.year).toBe("2053")
		expect(view?.real).toBe(false)
		expect(view?.segments).toHaveLength(4)
		expect(view?.segments.map((one) => one.name)).toEqual(["debts", "costs", "gifts", "heirs"])
		expect(view?.segments.map((one) => one.heirs)).toEqual([false, false, false, true])
		expect(view?.segments.reduce((sum, one) => sum + one.share, 0)).toBeCloseTo(1, 10)
		expect(view?.emptyBar).toBe(false)
	})

	test("says the amount is hidden with Hide amounts on", () => {
		expect(estateFocusView(figures(), "nominal", true)?.label).toBe(
			"What would your heirs receive? The amount is hidden. In 2053.",
		)
	})
})

describe("estateFocusView under today's money", () => {
	test("answers with what heirs receive in today's money, the same figure shownUnder shows", () => {
		const view = estateFocusView(figures(), "real", false)
		expect(view?.label).toBe("What would your heirs receive? 650k THB in today's money.")
		expect(view?.net).toBe("650000.00")
		expect(view?.real).toBe(true)
		expect(view?.segments).toEqual([{ share: 1, heirs: true, name: "heirs" }])
		expect(view?.emptyBar).toBe(false)
	})

	test("says the amount is hidden with Hide amounts on, and keeps today's money", () => {
		expect(estateFocusView(figures(), "real", true)?.label).toBe(
			"What would your heirs receive? The amount is hidden. In today's money.",
		)
	})
})

describe("estateFocusView's refusals and baselines", () => {
	test("has no answer for a short estate, which the page states in its own alert", () => {
		expect(estateFocusView(figures({ net: "-20000.00" }, "20000.00"), "nominal", false)).toBeNull()
	})

	test("has no answer when a line is negative, so it never draws a slice it cannot place", () => {
		expect(estateFocusView(figures({ debts: "-1.00" }), "nominal", false)).toBeNull()
	})

	test("keeps a zero estate as a baseline rather than a blank", () => {
		const zero = {
			gross: "0.00",
			debts: "0.00",
			costs: "0.00",
			gifts: "0.00",
			net: "0.00",
			toHeirs: "0.00",
			realNet: "0.00",
			realToHeirs: "0.00",
		}
		const view = estateFocusView(figures(zero), "nominal", false)
		expect(view?.label).toBe("What would your heirs receive? 0.00 THB in 2053.")
		expect(view?.emptyBar).toBe(true)
		expect(estateFocusView(figures(zero), "real", false)?.emptyBar).toBe(true)
	})
})
