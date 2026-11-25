import { describe, expect, it } from "bun:test"
import { codeOf } from "./builders.fixtures"
import { balanceHistory } from "./index"
import { chart, thb, tx } from "./queries.fixtures"

const MOST = Number.MAX_SAFE_INTEGER
const post = (id: string, date: string, cash: number) =>
	tx(id, date, [thb("cash", cash), thb("equity", -cash)])

describe("balanceHistory overflow", () => {
	const held = [post("a", "2024-01-05", 1), post("b", "2024-02-10", 5), post("c", "2024-03-01", -9)]

	it("names the first date a shifted Balance leaves the safe range", () => {
		const history = balanceHistory(held, chart)
		expect(history.overflow("cash", BigInt(MOST), "2024-01-01")).toEqual({
			date: "2024-01-05",
			sum: BigInt(MOST) + 1n,
		})
		expect(history.overflow("cash", BigInt(MOST - 5), "2024-01-01")).toEqual({
			date: "2024-02-10",
			sum: BigInt(MOST) + 1n,
		})
	})

	it("names `from` when the shifted Balance is already past the range there", () => {
		const over = balanceHistory(held, chart).overflow("cash", BigInt(MOST) + 1n, "2024-01-01")
		expect(over?.date).toBe("2024-01-01")
	})

	it("reads the negative end of the range too", () => {
		const over = balanceHistory(held, chart).overflow("equity", -BigInt(MOST), "2024-01-01")
		expect(over).toEqual({ date: "2024-01-05", sum: -BigInt(MOST) - 1n })
	})

	it("looks at no date from `before` on, though a later one overflows", () => {
		const history = balanceHistory(held, chart)
		const shift = BigInt(MOST - 5)
		expect(history.overflow("cash", shift, "2024-01-01", "2024-02-10")).toBeUndefined()
		expect(history.overflow("cash", shift, "2024-01-01", "2024-02-11")?.date).toBe("2024-02-10")
	})

	it("counts the rows of one date as one Balance", () => {
		const day = [post("a", "2024-01-05", 1), post("b", "2024-01-05", -1)]
		expect(balanceHistory(day, chart).overflow("cash", BigInt(MOST), "2024-01-01")).toBeUndefined()
	})

	it("answers for an account with no Posting from its shift alone", () => {
		const history = balanceHistory(held, chart)
		expect(history.overflow("food", 5n, "2024-01-01")).toBeUndefined()
		expect(history.overflow("food", BigInt(MOST) + 1n, "2024-01-01")?.date).toBe("2024-01-01")
	})

	it("scans only a segment that could overflow, and finds it clear when the overflow is past `before`", () => {
		const history = balanceHistory([...held, post("d", "2024-06-01", MOST - 5)], chart)
		expect(history.overflow("cash", 9n, "2024-01-01", "2024-03-02")).toBeUndefined()
		expect(history.overflow("cash", 9n, "2024-01-01")?.date).toBe("2024-06-01")
	})

	it("refuses an account that is not a Leaf, and a date that is not one, as balance does", () => {
		const history = balanceHistory(held, chart)
		expect(codeOf(() => history.overflow("nope", 0n, "2024-01-01"))).toBe("UNKNOWN_ACCOUNT")
		expect(codeOf(() => history.overflow("assets", 0n, "2024-01-01"))).toBe("NON_LEAF_ACCOUNT")
		expect(codeOf(() => history.overflow("cash", 0n, "2024-02-31"))).toBe("INVALID_DATE")
	})

	it("returns frozen answers", () => {
		expect(
			Object.isFrozen(balanceHistory(held, chart).overflow("cash", BigInt(MOST), "2024-01-01")),
		).toBe(true)
	})
})
