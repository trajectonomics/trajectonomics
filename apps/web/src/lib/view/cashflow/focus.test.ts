import { describe, expect, test } from "bun:test"
import { rollupsOf } from "./cashflow"
import { cashflowRunFixture } from "./fixtures.test-support"
import { cashflowFocusView } from "./focus"

const ROLLUPS = rollupsOf(cashflowRunFixture())

function rollupAt(index: number) {
	const rollup = ROLLUPS.find((one) => one.index === index)
	if (rollup === undefined) throw new Error(`the fixture has roll-up ${index}`)
	return rollup
}

describe("cashflowFocusView", () => {
	test("writes what is left over on the bar, with every use beside it", () => {
		const focus = cashflowFocusView(rollupAt(0), "THB", false)
		expect(focus?.label).toBe(
			"Where does your money go in 2026? 4.8k THB left over. From 124k THB coming in.",
		)
		expect(focus?.year).toBe("2026")
		expect(focus?.answer).toBe("4800.00")
		expect(focus?.short).toBe(false)
		expect(focus?.shortBar).toBeNull()
		expect(focus?.emptyBar).toBe(false)
		expect(focus?.segments.map((segment) => [segment.name, segment.accent])).toEqual([
			["tax", false],
			["spending", false],
			["saving", false],
			["left over", true],
		])
		expect(focus?.segments.map((segment) => segment.share)).toEqual([
			4200 / 124500,
			50700 / 124500,
			64800 / 124500,
			4800 / 124500,
		])
		expect(focus?.segments.at(-1)?.label).toBeNull()
		expect(focus?.segments[0]?.label).toBeNull()
	})

	test("writes the unmet amount as short, and draws money in against it", () => {
		const focus = cashflowFocusView(rollupAt(1), "THB", false)
		expect(focus?.label).toBe(
			"Where does your money go in 2027? 500.00 THB short. From 1k THB coming in.",
		)
		expect(focus?.answer).toBe("500.00")
		expect(focus?.short).toBe(true)
		expect(focus?.segments).toEqual([])
		expect(focus?.shortBar).toEqual({ moneyIn: 1000 / 1500, unmet: 500 / 1500 })
		expect(focus?.emptyBar).toBe(false)
	})

	test("draws a thin baseline when every use of the year is zero", () => {
		const rollup = rollupAt(0)
		const zero = rollup.totals.map((total) => ({ ...total, amount: "0.00" }))
		const focus = cashflowFocusView({ ...rollup, totals: zero }, "THB", false)
		expect(focus?.answer).toBe("0.00")
		expect(focus?.short).toBe(false)
		expect(focus?.segments.map((segment) => segment.share)).toEqual([0, 0, 0, 0])
		expect(focus?.emptyBar).toBe(true)
	})

	test("draws a zero left over as an answer with no accent width, never as a missing bar", () => {
		const rollup = rollupAt(0)
		const totals = rollup.totals.map((total) =>
			total.total === "left over" ? { ...total, amount: "0.00" } : total,
		)
		const focus = cashflowFocusView({ ...rollup, totals }, "THB", false)
		expect(focus?.answer).toBe("0.00")
		expect(focus?.segments.at(-1)?.share).toBe(0)
		expect(focus?.emptyBar).toBe(false)
	})

	test("has no focus point when the year states no totals row to draw", () => {
		const rollup = rollupAt(0)
		expect(
			cashflowFocusView(
				{ ...rollup, totals: rollup.totals.filter((total) => total.total !== "unmet") },
				"THB",
				false,
			),
		).toBeNull()
		expect(
			cashflowFocusView(
				{ ...rollup, totals: rollup.totals.filter((total) => total.total !== "spending") },
				"THB",
				false,
			),
		).toBeNull()
	})

	test("says the amount is hidden with Hide amounts on, and keeps no figure in the heading", () => {
		const focus = cashflowFocusView(rollupAt(0), "THB", true)
		expect(focus?.label).toBe(
			"Where does your money go in 2026? The amount is hidden. From an amount that is hidden coming in.",
		)
		expect(focus?.label).not.toContain("4.8k")
		expect(focus?.label).not.toContain("124k")
	})
})
