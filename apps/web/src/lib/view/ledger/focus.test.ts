import { describe, expect, test } from "bun:test"
import type { AccountList, TxList } from "../../contract"
import { ledgerFocusView } from "./focus"

const STAMP = "2026-01-01T00:00:00.000Z"
const AS_OF = "2026-10-31"
const SINCE = "2026-08-01"

function account(
	id: string,
	name: string,
	archivedAt: string | null = null,
	type: AccountList["accounts"][number]["type"] = "asset",
): AccountList["accounts"][number] {
	return {
		id,
		name,
		type,
		currency: "THB",
		parentId: null,
		archivedAt,
		version: 1,
		createdAt: STAMP,
		updatedAt: STAMP,
	}
}

function tx(id: string, date: string, ...accountIds: string[]): TxList["transactions"][number] {
	return {
		id,
		date,
		memo: null,
		linkedTo: null,
		externalRef: null,
		postings: accountIds.map((accountId, ordinal) => ({
			ordinal,
			account: { id: accountId, name: accountId },
			amount: ordinal === 0 ? "100.00" : "-100.00",
			currency: "THB",
			dimensions: null,
		})),
	}
}

const ACCOUNTS: AccountList = {
	accounts: [
		account("bank", "Bank"),
		account("card", "Card"),
		account("rent", "Rent"),
		account("cash", "Cash"),
		account("old", "Old card", "2026-02-01"),
		// Income and spending are not recorded as values, so they get no row.
		account("salary", "Salary", null, "income"),
		account("food", "Food", null, "expense"),
	],
}

const TRANSACTIONS: TxList = {
	transactions: [
		tx("t1", "2026-09-01", "rent", "bank"),
		tx("t2", "2026-09-20", "bank", "card"),
		tx("t3", "2026-10-10", "card", "bank"),
		tx("t4", "2026-10-28", "bank"),
		// The archived account's newest day is later, and must not move the axis or the answer.
		tx("t5", "2026-10-30", "old"),
	],
}

describe("ledgerFocusView", () => {
	test("answers with the newest last record, one row per active account", () => {
		const focus = ledgerFocusView(ACCOUNTS, TRANSACTIONS, AS_OF, SINCE)
		expect(focus?.label).toBe(
			"When did you last record your accounts? 28 Oct 2026. 4 accounts, 2 not recorded in the last month.",
		)
		expect(focus?.newest).toBe("2026-10-28")
		expect(focus?.start).toBe(SINCE)
		expect(focus?.asOf).toBe(AS_OF)
		expect(focus?.accounts).toBe(4)
		expect(focus?.stale).toBe(2)
		expect(focus?.rows.map((row) => [row.key, row.last, row.stale])).toEqual([
			["bank", "2026-10-28", false],
			["card", "2026-10-10", false],
			["rent", "2026-09-01", true],
			["cash", null, true],
		])
	})

	test("places each last record between the window's start and its As-of", () => {
		const focus = ledgerFocusView(ACCOUNTS, TRANSACTIONS, AS_OF, SINCE)
		const rows = new Map(focus?.rows.map((row) => [row.key, row.x]))
		expect(rows.get("rent")).toBeGreaterThan(0)
		expect(rows.get("cash")).toBe(0)
		const bank = rows.get("bank") ?? 0
		expect(bank).toBeGreaterThan(0)
		expect(bank).toBeLessThan(1)
	})

	test("places a newest record two months before the As-of away from the axis's end", () => {
		const focus = ledgerFocusView(
			{ accounts: [account("bank", "Bank")] },
			{ transactions: [tx("t1", "2026-08-31", "bank")] },
			AS_OF,
			SINCE,
		)
		expect(focus?.newest).toBe("2026-08-31")
		const x = focus?.rows[0]?.x ?? 1
		expect(x).toBeGreaterThan(0)
		expect(x).toBeLessThan(1)
	})

	test("keeps a focus point when no account has a record in the window", () => {
		const focus = ledgerFocusView(
			{ accounts: [account("bank", "Bank"), account("card", "Card")] },
			{ transactions: [tx("t1", "2026-07-31", "bank", "card")] },
			AS_OF,
			SINCE,
		)
		expect(focus?.label).toBe(
			"When did you last record your accounts? Not since 1 Aug 2026. 2 accounts, 2 not recorded in the last month.",
		)
		expect(focus?.newest).toBeNull()
		expect(focus?.stale).toBe(2)
		expect(focus?.rows.map((row) => [row.last, row.stale, row.x])).toEqual([
			[null, true, 0],
			[null, true, 0],
		])
	})

	test("counts only an account whose last record is before the As-of's month", () => {
		const focus = ledgerFocusView(
			{ accounts: [account("bank", "Bank"), account("edge", "Edge")] },
			{
				transactions: [tx("t1", "2026-09-28", "edge", "bank"), tx("t2", "2026-10-28", "bank")],
			},
			"2026-10-28",
			SINCE,
		)
		expect(focus?.rows.find((row) => row.key === "edge")?.stale).toBe(false)
	})

	test("has no focus point without an active account", () => {
		expect(
			ledgerFocusView(
				{ accounts: [account("old", "Old", "2026-02-01")] },
				TRANSACTIONS,
				AS_OF,
				SINCE,
			),
		).toBeNull()
	})
})
