import { describe, expect, it } from "bun:test"
import { codeOf, thrown } from "./builders.fixtures"
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
		expect(history.at("cash", "2024-02-28", new Map([["cash", 700n]]))).toBe(more)
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
		expect(
			codeOf(() =>
				balanceHistory(ledger, chart).at("cash", "2024-02-28", new Map([["cash", over]])),
			),
		).toBe("AMOUNT_OVERFLOW")
	})

	describe("refuses a Balance that overflows as balance does, on whichever Leaf it is", () => {
		const MOST = Number.MAX_SAFE_INTEGER
		const held = [
			tx("big", "2024-01-01", [thb("cash", MOST), thb("equity", -MOST)]),
			tx("one", "2024-01-02", [thb("cash", 1), thb("equity", -1)]),
		]
		/** What `balance` throws on the Ledger with `added` in, and what the history throws holding `added` as `extra`. */
		const same = (
			transactions: typeof held,
			target: string,
			asOf: string,
			added: typeof held = [],
		) => {
			const extra = new Map<string, bigint>()
			for (const { postings } of added) {
				for (const p of postings)
					extra.set(p.accountId, (extra.get(p.accountId) ?? 0n) + BigInt(p.amount))
			}
			const old = thrown(() => balance([...transactions, ...added], target, asOf, chart))
			const now = thrown(() => balanceHistory(transactions, chart).at(target, asOf, extra))
			expect(now?.code).toBe(old?.code)
			expect(now?.field).toBe(old?.field)
			return now
		}

		it("on another Leaf the Ledger already holds, whatever Leaf is asked for", () => {
			expect(same(held, "food", "2024-01-02")?.code).toBe("AMOUNT_OVERFLOW")
			expect(same(held, "cash", "2024-01-02")?.field).toBe("balance.amount")
		})

		it("on no Leaf before the Balance passes the range", () => {
			expect(same(held, "food", "2024-01-01")).toBeUndefined()
		})

		it("on a Leaf the caller's extra pushes over, ahead of the Leaf asked for", () => {
			const base = [tx("s", "2024-01-01", [thb("savings", 1), thb("equity", -1)])]
			const push = [tx("p", "2024-01-02", [thb("savings", MOST), thb("equity", -MOST)])]
			expect(same(base, "food", "2024-01-02", push)?.field).toBe("balance[savings]")
			expect(same(base, "equity", "2024-01-02", push)?.field).toBe("balance[savings]")
			expect(same(base, "savings", "2024-01-02", push)?.field).toBe("balance.amount")
		})
	})
})
