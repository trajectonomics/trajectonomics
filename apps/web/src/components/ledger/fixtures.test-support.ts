import type { AccountList, Balance, ErrorBody, Read, TxList } from "../../lib/contract"

const stamp = "2026-01-01T00:00:00.000Z"

/** A failed Read, as the runner keeps it: its argv and the CLI's error envelope. */
export function failure<T>(argv: string[], message: string): Read<T> {
	const error: ErrorBody = { code: "LEDGER_EMPTY", exitCode: 2, message }
	return { argv, ok: false, error }
}

/** A chart of accounts: a header with a child, and an archived liability. */
export const accountList: Read<AccountList> = {
	argv: ["account", "list", "--json"],
	ok: true,
	data: {
		accounts: [
			account("bank", "Bank", "asset", null, null),
			account("checking", "Checking", "asset", "bank", null),
			account("old", "Old card", "liability", null, stamp),
		],
	},
}

function account(
	id: string,
	name: string,
	type: AccountList["accounts"][number]["type"],
	parentId: string | null,
	archivedAt: string | null,
): AccountList["accounts"][number] {
	return {
		id,
		name,
		type,
		currency: "THB",
		parentId,
		archivedAt,
		version: 1,
		createdAt: stamp,
		updatedAt: stamp,
	}
}

/** A trial balance with one leaf of 1,500.00 debit and totals that agree. */
export const trial = {
	rows: [
		{
			account: { id: "checking", name: "Checking" },
			debit: "1500.00",
			credit: "0.00",
			currency: "THB",
		},
		{ account: { id: "old", name: "Old card" }, debit: "0.00", credit: "0.00", currency: "THB" },
	],
	totals: [{ currency: "THB", debit: "1500.00", credit: "0.00" }],
}

/** The balances at 31 Oct 2026, with the trial balance above. */
export const balance: Read<Balance> = {
	argv: ["balance", "--as-of", "2026-10-31", "--trial-balance", "--json"],
	ok: true,
	data: {
		asOf: "2026-10-31",
		rows: [
			{
				account: { id: "checking", name: "Checking" },
				type: "asset",
				amount: "1500.00",
				currency: "THB",
			},
		],
		netWorth: [{ currency: "THB", amount: "1500.00" }],
		trialBalance: trial,
	},
}

/** One posting of a transaction: its account, amount and ordinal. */
export function leg(accountId: string, name: string, amount: string, ordinal: number) {
	return {
		ordinal,
		account: { id: accountId, name },
		amount,
		currency: "THB",
		dimensions: null,
	}
}

/** A transaction with its postings. */
export function tx(
	id: string,
	date: string,
	memo: string | null,
	postings: ReturnType<typeof leg>[],
): TxList["transactions"][number] {
	return { id, date, memo, linkedTo: null, externalRef: null, postings }
}
