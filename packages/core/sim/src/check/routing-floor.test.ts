import { describe, expect, it } from "bun:test"
import { thaiEmployee } from "../fixtures/thai-employee"
import { expected, problemsFor } from "../testing"

const withdraw = ["cashflow", "withdraw"] as const
const surplus = ["cashflow", "surplus"] as const
const at = (...rest: (string | number)[]) => ["scenario", "cashflow", ...rest]
const floorTo = (downTo: unknown, account = "emergency-fund") => ({ account, downTo })

function withWithdraw(list: unknown) {
	return problemsFor({ scenario: [[...withdraw], list] })
}

describe("check() share steps", () => {
	it("accepts a share step that is not last, with or without a cap", () => {
		const steps = [{ account: "cash", share: 3000, upTo: 500_000 }, { account: "emergency-fund" }]
		expect(problemsFor({ scenario: [[...surplus], steps] })).toEqual([])
	})

	it("refuses a share of 0, of 10001 and of 1.5 bps", () => {
		for (const share of [0, 10_001, 1.5]) {
			const steps = [{ account: "cash", share }, { account: "emergency-fund" }]
			expect(problemsFor({ scenario: [[...surplus], steps] }).map((item) => item.path)).toEqual([
				at("surplus", 0, "share"),
			])
		}
	})

	it("refuses a share on the last step, which must take everything", () => {
		const steps = [
			{ account: "cash", upTo: 5 },
			{ account: "emergency-fund", share: 10_000 },
		]
		expect(problemsFor({ scenario: [[...surplus], steps] })).toEqual(
			expected("SURPLUS_SHARE_LAST", at("surplus", 1, "share")),
		)
	})
})

describe("check() withdrawal floors", () => {
	it("accepts a floor, then the Account again plain, and a floor in today's money", () => {
		const list = [floorTo(300_000), "cash", "emergency-fund"]
		expect(withWithdraw(list)).toEqual([])
		const real = floorTo({ amount: 300_000, growth: "inflation" })
		expect(withWithdraw([real, floorTo({ amount: 100, growth: "inflation" }), "cash"])).toEqual([])
	})

	it("accepts a lower floor after a higher one on the same growth", () => {
		expect(withWithdraw([floorTo(300_000), floorTo(100_000), "cash"])).toEqual([])
		const grown = (amount: number) => floorTo({ amount, growth: { bps: 200 } })
		expect(withWithdraw([grown(300_000), grown(100_000)])).toEqual([])
	})

	it("refuses a repeat with the same or a higher floor, at the repeat's downTo", () => {
		for (const downTo of [300_000, 400_000]) {
			expect(withWithdraw([floorTo(300_000), floorTo(downTo)])).toEqual(
				expected("WITHDRAW_FLOOR_ORDER", at("withdraw", 1, "downTo")),
			)
		}
	})

	it("refuses a floored entry after a plain entry of the same Account", () => {
		expect(withWithdraw(["emergency-fund", floorTo(100_000)])).toEqual(
			expected("WITHDRAW_FLOOR_ORDER", at("withdraw", 1, "downTo")),
		)
	})

	it("refuses floors it cannot order: a number after a grown floor, or two growths", () => {
		const grown = floorTo({ amount: 300_000, growth: "inflation" })
		expect(withWithdraw([grown, floorTo(100_000)])).toEqual(
			expected("WITHDRAW_FLOOR_ORDER", at("withdraw", 1, "downTo")),
		)
		expect(withWithdraw([grown, floorTo({ amount: 1, growth: { bps: 100 } })])).toEqual(
			expected("WITHDRAW_FLOOR_ORDER", at("withdraw", 1, "downTo")),
		)
	})

	it("keeps a repeated plain Account a DUPLICATE_ID, as before", () => {
		expect(withWithdraw(["cash", "cash"])).toEqual(expected("DUPLICATE_ID", at("withdraw", 1)))
	})

	it("reads a floored entry's shape: a missing or negative downTo, an unknown Account", () => {
		expect(withWithdraw([{ account: "cash" }])).toEqual(
			expected("MISSING_KEY", at("withdraw", 0, "downTo")),
		)
		expect(withWithdraw([floorTo(-1, "cash")])).toEqual(
			expected("NEGATIVE_AMOUNT", at("withdraw", 0, "downTo")),
		)
		expect(withWithdraw([floorTo(5, "ghost")])).toEqual(
			expected("UNKNOWN_ACCOUNT", at("withdraw", 0, "account")),
		)
		expect(withWithdraw([floorTo({ amount: 5 }, "cash")])).toEqual(
			expected("MISSING_KEY", at("withdraw", 0, "downTo", "growth")),
		)
	})

	it("refuses an Illiquid Account in a floored entry, at its account", () => {
		const { scenario } = thaiEmployee
		const accounts = scenario.accounts.map((item) =>
			item.id === "emergency-fund" ? { ...item, liquid: false } : item,
		)
		const cashflow = { ...scenario.cashflow, withdraw: [floorTo(5), "cash"] }
		const found = problemsFor({ scenario: [[], { ...scenario, accounts, cashflow }] })
		// The surplus step that names the same Account is refused too.
		expect(found.map((item) => item.path)).toContainEqual(at("withdraw", 0, "account"))
		expect(found.every((item) => item.code === "ILLIQUID_ROUTED")).toBe(true)
	})
})
