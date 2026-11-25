import type { TxList } from "../../contract"
import { formatDate } from "../../format"
import { type AccountNames, NO_NAMES, refLabel } from "../account-names"

/** One posting of a loaded transaction, with its account and the CLI's signed amount. */
export interface PostingLine {
	readonly key: string
	readonly accountId: string
	readonly account: string
	readonly currency: string
	readonly amount: string
}

/** One loaded transaction, ready to show: its date, its memo and its postings. */
export interface TransactionRow {
	readonly id: string
	readonly date: string
	readonly memo: string | null
	readonly postings: readonly PostingLine[]
}

/** The two filters of the transactions table. An empty account means every account. */
export interface TransactionFilter {
	readonly account: string
	readonly memo: string
}

/** A choice in the account filter. */
export interface AccountOption {
	readonly value: string
	readonly label: string
}

/** The loaded transactions, newest first. Transactions on one date sort by id, descending. */
export function transactionRows(list: TxList, names: AccountNames = NO_NAMES): TransactionRow[] {
	return list.transactions
		.map((tx) => ({
			id: tx.id,
			date: tx.date,
			memo: tx.memo,
			postings: tx.postings.map((posting) => ({
				key: `${tx.id}:${posting.ordinal}`,
				accountId: posting.account.id,
				account: refLabel(names, posting.account),
				currency: posting.currency,
				amount: posting.amount,
			})),
		}))
		.sort((a, b) => compareDescending(a.date, b.date) || compareDescending(a.id, b.id))
}

function compareDescending(a: string, b: string): number {
	if (a === b) return 0
	return a < b ? 1 : -1
}

/**
 * The rows that pass both filters. The filters only hide rows already loaded: an account matches a
 * row with a posting to it, and a memo matches by a case-insensitive part of its text.
 */
export function filterTransactions(
	rows: readonly TransactionRow[],
	filter: TransactionFilter,
): TransactionRow[] {
	const memo = filter.memo.trim().toLowerCase()
	return rows.filter(
		(row) =>
			(filter.account === "" || row.postings.some((p) => p.accountId === filter.account)) &&
			(memo === "" || (row.memo ?? "").toLowerCase().includes(memo)),
	)
}

/**
 * The accounts the account filter offers: "All accounts", then each account with a posting in the
 * loaded rows, by name. A selected account that no loaded row names is still offered, so the
 * control shows what is applied.
 */
export function accountOptions(rows: readonly TransactionRow[], selected: string): AccountOption[] {
	const names = new Map<string, string>()
	for (const row of rows) {
		for (const posting of row.postings) names.set(posting.accountId, posting.account)
	}
	if (selected !== "" && !names.has(selected)) names.set(selected, selected)
	const sorted = [...names].sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
	return [
		{ value: "", label: "All accounts" },
		...sorted.map(([value, label]) => ({ value, label })),
	]
}

/** The dates a transactions Read was asked for: the values of its --since and --until arguments. */
export function periodOfRead(argv: readonly string[]): {
	since: string | null
	until: string | null
} {
	return { since: argumentValue(argv, "--since"), until: argumentValue(argv, "--until") }
}

/** The period in words, such as "1 Aug 2026 to 31 Oct 2026". Says so when a bound is missing. */
export function describePeriod(argv: readonly string[]): string {
	const { since, until } = periodOfRead(argv)
	const from = since === null ? "the start of the ledger" : formatDate(since)
	const to = until === null ? "the latest transaction" : formatDate(until)
	return `${from} to ${to}`
}

function argumentValue(argv: readonly string[], flag: string): string | null {
	const index = argv.indexOf(flag)
	return index === -1 ? null : (argv[index + 1] ?? null)
}
