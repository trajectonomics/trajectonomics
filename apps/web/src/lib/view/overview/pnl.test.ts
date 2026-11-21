import { describe, expect, test } from "bun:test"
import { pnl, row } from "./fixtures.test-support"
import { largestRows, pnlView } from "./pnl"

describe("largestRows", () => {
	test("takes the rows of greatest size, largest first, whatever their sign", () => {
		const rows = [
			row("Rent", "expense", "140000.00"),
			row("Salary", "income", "-900000.00"),
			row("Travel", "expense", "36500.00"),
			row("Living", "expense", "348500.00"),
		]
		expect(largestRows(rows, 3).map((item) => item.account.name)).toEqual([
			"Salary",
			"Living",
			"Rent",
		])
	})

	test("keeps the CLI's own order between rows of equal size", () => {
		const rows = [row("First", "expense", "10.00"), row("Second", "income", "-10.00")]
		expect(largestRows(rows, 3).map((item) => item.account.name)).toEqual(["First", "Second"])
	})

	test("returns the rows as they are when there are fewer than the count, and none for none", () => {
		expect(largestRows([row("Only", "income", "-1.00")], 3)).toHaveLength(1)
		expect(largestRows([], 3)).toEqual([])
	})

	test("does not change the amounts it orders", () => {
		const [top] = largestRows([row("Salary", "income", "-900000.00")], 1)
		expect(top?.amount).toBe("-900000.00")
	})
})

describe("pnlView", () => {
	test("names the period from since to until", () => {
		const view = pnlView(pnl([], [], "2026-01-01", "2026-10-31"))
		expect(view.period).toBe("1 Jan 2026 to 31 Oct 2026")
		expect(view.hasRows).toBe(false)
	})

	test("says up to the date when there is no start", () => {
		expect(pnlView(pnl([], [], null, "2026-10-31")).period).toBe("Up to 31 Oct 2026")
	})

	test("carries the CLI's totals through unchanged", () => {
		const view = pnlView(
			pnl([row("Salary", "income", "-900000.00")], [{ currency: "THB", amount: "900000.00" }]),
		)
		expect(view.totals).toEqual([{ currency: "THB", amount: "900000.00" }])
		expect(view.largest).toHaveLength(1)
	})
})
