import {
	accountId,
	balance as balanceAt,
	statedAmount,
	type Transaction,
} from "@trajectonomics/core/ledger"
import { isAppError } from "../../errors"
import {
	type AccountRow,
	formatMinorUnits,
	type Ledger,
	parseMinorUnits,
	type TxRow,
} from "../../store"

/** What a valuation's memo starts with: the CLI writes it, and a later write finds its own by it. */
export const MEMO_PREFIX = "Valued at "

/** A valuation's whole memo: the prefix and one decimal, nothing a person would add to their own note. */
const VALUATION_MEMO = /^Valued at (-?\d+(?:\.\d+)?)$/

/** A candidate Valuation entry: its row, its Transaction, and the value its memo states. */
export type StoredValuation = { row: TxRow; transaction: Transaction; stated: string }

/**
 * The transactions whose memo is exactly a valuation's and that have two postings, by date then
 * id. A Reversal is never one, and neither is a transaction a Reversal withdrew, so a voided or
 * amended valuation names nothing. Whether one is a valuation of a given account is
 * `laterValuations`' check.
 */
export function storedValuations(ledger: Ledger, rows: readonly TxRow[]): StoredValuation[] {
	const withdrawn = new Set(
		rows.flatMap((row) =>
			row.correctionKind === "reversal" && row.linkedTo !== null ? [row.linkedTo] : [],
		),
	)
	const byId = new Map(ledger.transactions.map((tx) => [tx.id as string, tx]))
	const found: StoredValuation[] = []
	for (const row of rows) {
		const stated = VALUATION_MEMO.exec(row.memo ?? "")?.[1]
		const transaction = byId.get(row.id)
		if (stated === undefined || transaction === undefined) continue
		if (row.correctionKind === "reversal" || withdrawn.has(row.id)) continue
		if (transaction.postings.length === 2) found.push({ row, transaction, stated })
	}
	return found.sort((a, b) =>
		a.row.date === b.row.date
			? a.row.id.localeCompare(b.row.id)
			: a.row.date.localeCompare(b.row.date),
	)
}

/**
 * Whether a candidate is a Valuation entry of this account: one posting on it, the other on an
 * income or equity account, and a stated value that parses in the account's currency. A person's
 * own transaction with a lookalike memo fails one of these.
 */
function isValuationOf(entry: StoredValuation, account: AccountRow, ledger: Ledger): boolean {
	const postings = entry.transaction.postings
	const own = postings.filter((p) => (p.accountId as string) === account.id)
	const other = postings.find((p) => (p.accountId as string) !== account.id)
	const type = other === undefined ? undefined : ledger.chart.get(accountId(other.accountId))?.type
	if (own.length !== 1 || (type !== "income" && type !== "equity")) return false
	return !isAppError(parseMinorUnits(entry.stated, account.currency))
}

/** The stored valuations of one account dated after `date`, earliest first. */
export function laterValuations(
	ledger: Ledger,
	stored: readonly StoredValuation[],
	account: AccountRow,
	date: string,
): StoredValuation[] {
	return stored.filter((entry) => entry.row.date > date && isValuationOf(entry, account, ledger))
}

/** The sentence a write carries when it moves valuations stated after it. */
export function laterNote(input: {
	account: AccountRow
	date: string
	difference: string
	later: readonly StoredValuation[]
	becomes: string
}): string {
	const [first, ...others] = input.later
	if (first === undefined) return ""
	const moves = input.account.type === "liability" ? "what it owes" : "its value"
	const more =
		others.length === 0
			? ""
			: ` ${others.length} more later ${others.length === 1 ? "valuation moves" : "valuations move"} by the same amount.`
	return (
		`"${input.account.name}" has a later valuation: ${first.row.date}, valued at ${first.stated} (transaction ${first.row.id}). ` +
		`This write moves ${moves} by ${input.difference} from ${input.date} on, so on ${first.row.date} it becomes ${input.becomes} ` +
		`and that valuation no longer holds; value it again on ${first.row.date} to restate it.${more}`
	)
}

/**
 * The note a write carries when stored valuations of the account are dated after it: it names the
 * earliest and says what the value on its date becomes, read from the Ledger with this write in.
 */
export function laterNotes(input: {
	ledger: Ledger
	stored: readonly StoredValuation[]
	transactions: readonly Transaction[]
	account: AccountRow
	date: string
	difference: number
}): string[] {
	const { account, ledger } = input
	const later = laterValuations(ledger, input.stored, account, input.date)
	const first = later[0]
	if (first === undefined) return []
	const after = balanceAt(input.transactions, account.id, first.row.date, ledger.chart).amount
	const money = (amount: number) => formatMinorUnits(amount, account.currency)
	return [
		laterNote({
			account,
			date: input.date,
			difference: money(input.difference),
			later,
			becomes: money(statedAmount(account.type, after)),
		}),
	]
}
