import { describe, expect, test } from "bun:test"
import { inYear } from "./fixtures.test-support"
import { allowancesFocusView } from "./focus"

describe("allowancesFocusView", () => {
	test("states the saving and the year, with one bar per allowance that has room", () => {
		const view = allowancesFocusView(inYear("2026-10-31"), false)
		if (view === null) throw new Error("the golden has a year with room")
		expect(view.label).toBe(
			"How much tax could you still save? 28.1k THB by taking more of your allowances in 2026.",
		)
		expect(view.saving).toBe("28100.00")
		expect(view.currency).toBe("THB")
		expect(view.bars).toHaveLength(2)
		for (const bar of view.bars) expect(bar.taken + bar.left).toBeCloseTo(1, 10)
	})

	test("fills the part this plan takes, and outlines the rest", () => {
		const data = inYear("2026-10-31")
		const row = data.allowances[0]
		if (row === undefined) throw new Error("the golden has a row")
		row.planned = "81000.00"
		row.extra = "243000.00"
		const view = allowancesFocusView(data, false)
		expect(view?.bars[0]?.taken).toBeCloseTo(0.25, 10)
		expect(view?.bars[0]?.left).toBeCloseTo(0.75, 10)
	})

	test("says the amount is hidden with Hide amounts on", () => {
		expect(allowancesFocusView(inYear("2026-10-31"), true)?.label).toBe(
			"How much tax could you still save? The amount is hidden. By taking more of your allowances in 2026.",
		)
	})

	test("has no answer when no year holds the As-of", () => {
		expect(allowancesFocusView(inYear("2031-01-01"), false)).toBeNull()
	})
})
