import { describe, expect, it } from "bun:test"
import { codeOf } from "./builders.fixtures"
import { balance, balanceHistory } from "./index"
import { chart, ledger, thb, tx } from "./queries.fixtures"

const leaves = ["cash", "savings", "loan", "equity", "salary", "food", "usd-wallet"]
const dates = ["2023-12-31", "2024-01-01", "2024-01-15", "2024-02-28", "2024-12-31", "2025-06-01"]

describe("balanceHistory", () => {
	it("gives what balance gives for every Leaf Account on every date", () => {
		const history = balanceHistory(ledger, chart)
		for (const id of leaves) {
			for (const asOf of dates) {
				expect(history.at(id, asOf)).toBe(balance(ledger, id, asOf, chart).amount)
			}
		}
	})

	it("is independent of the order the Transactions are listed in", () => {
		const history = balanceHistory([...ledger].reverse(), chart)
		for (const asOf of dates) {
			expect(history.at("cash", asOf)).toBe(balance(ledger, "cash", asOf, chart).amount)
		}
	})

	it("adds `plus` to the Balance as one sum", () => {
		const extra = tx("extra", "2024-01-20", [thb("cash", 700), thb("equity", -700)])
		const history = balanceHistory(ledger, chart)
		const more = balance([...ledger, extra], "cash", "2024-02-28", chart).amount
		expect(history.at("cash", "2024-02-28", 700n)).toBe(more)
	})

	it("rejects an unknown account with UNKNOWN_ACCOUNT, as balance does", () => {
		expect(codeOf(() => balanceHistory(ledger, chart).at("nope", "2024-02-28"))).toBe(
			"UNKNOWN_ACCOUNT",
		)
	})

	it("rejects a Header Account with NON_LEAF_ACCOUNT, as balance does", () => {
		expect(codeOf(() => balanceHistory(ledger, chart).at("assets", "2024-02-28"))).toBe(
			"NON_LEAF_ACCOUNT",
		)
	})

	it("rejects a date that is not one with INVALID_DATE", () => {
		expect(codeOf(() => balanceHistory(ledger, chart).at("cash", "2024-02-31"))).toBe(
			codeOf(() => balance(ledger, "cash", "2024-02-31", chart)),
		)
	})

	it("rejects a sum outside the safe integer range with AMOUNT_OVERFLOW", () => {
		const over = BigInt(Number.MAX_SAFE_INTEGER) + 1n
		expect(codeOf(() => balanceHistory(ledger, chart).at("cash", "2024-02-28", over))).toBe(
			"AMOUNT_OVERFLOW",
		)
	})
})
