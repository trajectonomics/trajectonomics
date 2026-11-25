import { describe, expect, it } from "bun:test"
import { bodyOf, bothPlans, MOST, own } from "./account-value-equivalence-support"
import { chartHome } from "./account-value-support"
import { isAppError } from "./errors"

/**
 * The named exceptions (ADR-0072, 2026-11-25): the full rescan reads a Balance only at an
 * entry's own date, so it accepts a valuation after which a dated Balance of the valued or the
 * against account, on the entry's date or later, is outside the safe range. The running Balance
 * refuses it, when the batch made that Balance worse than the Ledger had it.
 */
describe("the exceptions: a write after which a Balance is outside the safe range", () => {
	it("refuses a transaction dated after the valuation that overflows it, naming the account and the first date", async () => {
		const { home, traj } = await chartHome()
		await own(traj, "Equity", "Fund", "1.00", "2026-01-05")
		const { fast, slow } = bothPlans(home, [{ account: "Fund", date: "2026-01-01", value: MOST }])
		expect(isAppError(slow)).toBe(false)
		const body = bodyOf(fast)
		expect(body.code).toBe("AMOUNT_OVERFLOW")
		expect(JSON.stringify(body.details)).toContain('"Fund\\" on 2026-01-05')
	})

	it("refuses the against account going over on the last entry's own date", async () => {
		const { home } = await chartHome()
		const { fast, slow } = bothPlans(home, [
			{ account: "Fund", date: "2026-01-01", value: MOST },
			{ account: "Home", date: "2026-01-05", value: "1.00" },
		])
		expect(isAppError(slow)).toBe(false)
		const body = bodyOf(fast)
		expect(body.code).toBe("AMOUNT_OVERFLOW")
		expect(JSON.stringify(body.details)).toContain('"index":1')
		expect(JSON.stringify(body.details)).toContain('the Balance of \\"Gains\\" on 2026-01-05')
	})

	it("accepts what the full rescan accepts once the later Balance is back in range", async () => {
		const { home, traj } = await chartHome()
		await own(traj, "Equity", "Fund", "1.00", "2026-01-05")
		await own(traj, "Fund", "Food", "1.00", "2026-01-05")
		const { fast, slow } = bothPlans(home, [{ account: "Fund", date: "2026-01-01", value: MOST }])
		expect(isAppError(fast)).toBe(false)
		expect(fast).toEqual(slow)
	})

	it("accepts a write that shrinks an overflow the Ledger already holds, as the full rescan does", async () => {
		const { home, traj } = await chartHome()
		await own(traj, "Equity", "Fund", "90071992547399.91", "2026-01-05")
		await own(traj, "Equity", "Fund", "11.00", "2026-01-06")
		await own(traj, "Fund", "Food", "11.00", "2026-01-07")
		const { fast, slow } = bothPlans(home, [
			{ account: "Fund", date: "2026-01-01", value: "-0.50" },
		])
		expect(isAppError(fast)).toBe(false)
		expect(fast).toEqual(slow)
	})
})
