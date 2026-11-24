import type { AmountRow, Snapshot } from "../../contract"
import type { ListedAccount } from "../ledger/account-tree"

/** A listed account, open and a Leaf unless an override says otherwise. */
export function account(
	id: string,
	name: string,
	overrides: Partial<ListedAccount> = {},
): ListedAccount {
	return {
		id,
		name,
		type: "asset",
		currency: "THB",
		parentId: null,
		archivedAt: null,
		version: 1,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	}
}

/** A chart of accounts with three top-level headers (one Thai), assets with no parent, a debt, an archived one and the accounts to count against. */
export const CHART: ListedAccount[] = [
	account("debt", "Car Loan", { type: "liability" }),
	account("old-debt", "Old Loan", { type: "liability", archivedAt: "2026-02-01T00:00:00.000Z" }),
	account("cash-header", "Cash"),
	account("bank", "Bank", { parentId: "cash-header" }),
	account("invest-header", "Investments"),
	account("index", "Index tracker", { parentId: "invest-header" }),
	account("thai-header", "ทรัพย์สิน"),
	account("condo", "คอนโด", { parentId: "thai-header" }),
	account("fund", "Fund"),
	account("home", "Home"),
	account("mystery", "Mystery box"),
	account("gains", "Gains", { type: "income" }),
	account("equity", "Opening equity", { type: "equity" }),
	account("old-gains", "Old gains", { type: "income", archivedAt: "2026-02-01T00:00:00.000Z" }),
	account("rent", "Rent", { type: "expense" }),
]

const row = (id: string, name: string, type: AmountRow["type"], amount: string): AmountRow => ({
	account: { id, name },
	type,
	amount,
	currency: "THB",
})

const posting = (id: string, name: string) => ({
	ordinal: 0,
	account: { id, name },
	amount: "1.00",
	currency: "THB",
	dimensions: null,
})

/** A Snapshot with only the reads the sheet uses; the rest of a Snapshot is never read by it. */
export function sheetSnapshot(accounts: ListedAccount[] = CHART): Snapshot {
	const tx = (id: string, date: string, ...ids: [string, string][]) => ({
		id,
		date,
		memo: null,
		linkedTo: null,
		externalRef: null,
		postings: ids.map(([a, n]) => posting(a, n)),
	})
	return {
		params: { asOf: "2026-10-31" },
		reads: {
			accounts: { argv: [], ok: true, data: { accounts } },
			balance: {
				argv: [],
				ok: true,
				data: {
					asOf: "2026-10-31",
					rows: [
						row("bank", "Bank", "asset", "1500.00"),
						row("fund", "Fund", "asset", "9000.00"),
						row("debt", "Car Loan", "liability", "-4000.00"),
					],
					netWorth: [],
				},
			},
			transactions: {
				argv: ["tx", "list", "--since", "2026-08-01", "--until", "2026-10-31", "--json"],
				ok: true,
				data: {
					transactions: [
						tx("t1", "2026-09-02", ["bank", "Bank"], ["fund", "Fund"]),
						tx("t2", "2026-10-30", ["bank", "Bank"], ["gains", "Gains"]),
					],
				},
			},
		},
	} as unknown as Snapshot
}
