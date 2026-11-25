import { describe, expect, it } from "bun:test"
import { thrown } from "./builders.fixtures"
import { netWorth, netWorthHistory } from "./index"
import { bal, chart, ledger, thb, tot, tx } from "./queries.fixtures"

describe("netWorth", () => {
	it("shows raw asset and liability rows and a natural-sign total per Entity and Currency", () => {
		expect(netWorth(ledger, "2024-02-28", chart)).toEqual({
			rows: [
				bal("default", "cash", "THB", 3_780_000),
				bal("default", "loan", "THB", -100_000),
				bal("default", "savings", "THB", 300_000),
				bal("default", "usd-wallet", "USD", 10_000),
				bal("other-co", "other-cash", "THB", 0),
			],
			totals: [
				tot("default", "THB", 3_980_000),
				tot("default", "USD", 10_000),
				tot("other-co", "THB", 0),
			],
		})
	})

	it("excludes Equity and counts only Transactions up to asOf", () => {
		const early = netWorth(ledger, "2024-01-01", chart)
		expect(early.totals[0]).toEqual(tot("default", "THB", 200_000))
	})
})

describe("netWorthHistory", () => {
	const dates = ["2023-12-31", "2024-01-01", "2024-01-15", "2024-02-28", "2024-12-31", "2025-06-01"]

	it("gives what netWorth gives on every date, from one read", () => {
		const history = netWorthHistory(ledger, chart)
		for (const asOf of dates) expect(history.at(asOf)).toEqual(netWorth(ledger, asOf, chart))
	})

	it("is independent of the order the Transactions are listed in", () => {
		const history = netWorthHistory([...ledger].reverse(), chart)
		for (const asOf of dates) expect(history.at(asOf)).toEqual(netWorth(ledger, asOf, chart))
	})

	it("refuses a date that is not one as netWorth does", () => {
		const old = thrown(() => netWorth(ledger, "2024-02-31", chart))
		const now = thrown(() => netWorthHistory(ledger, chart).at("2024-02-31"))
		expect(now?.code).toBe("INVALID_DATE")
		expect(now).toEqual(old)
	})

	it("refuses an overflow on the same Leaf and field as netWorth, and only on the dates it reaches", () => {
		const most = Number.MAX_SAFE_INTEGER
		const held = [
			...ledger,
			tx("big", "2024-03-01", [thb("cash", most), thb("equity", -most)]),
			tx("one", "2024-03-02", [thb("cash", 1), thb("equity", -1)]),
		]
		const history = netWorthHistory(held, chart)
		for (const asOf of [...dates, "2024-03-01", "2024-03-02", "2024-03-03"]) {
			const old = thrown(() => netWorth(held, asOf, chart))
			const now = thrown(() => history.at(asOf))
			expect(now).toEqual(old)
			if (asOf < "2024-03-01") expect(now).toBeUndefined()
			else expect(now?.code).toBe("AMOUNT_OVERFLOW")
		}
	})

	it("refuses a Ledger the scan refuses, at construction", () => {
		const twice = [...ledger, ledger[0]!]
		const old = thrown(() => netWorth(twice, "2024-02-28", chart))
		expect(old?.code).toBe("DUPLICATE_TRANSACTION_ID")
		expect(thrown(() => netWorthHistory(twice, chart))).toEqual(old)
	})
})
