import { balance as balanceAt, type Transaction } from "@trajectonomics/core/ledger"
import { type AccountRow, formatMinorUnits, type Ledger, type TxRow } from "../../store"

/** What a valuation's memo starts with: the CLI writes it, and a later write finds its own by it. */
export const MEMO_PREFIX = "Valued at "

/** A stored Valuation entry: its row, and the accounts it posts to. */
export type StoredValuation = { row: TxRow; accountIds: ReadonlySet<string> }

/**
 * The Valuation entries a ledger still holds, by date then id. A Reversal is never one, and neither
 * is a transaction a Reversal withdrew, so a voided or amended valuation names nothing.
 */
export function storedValuations(ledger: Ledger, rows: readonly TxRow[]): StoredValuation[] {
	const withdrawn = new Set(
		rows.flatMap((row) =>
			row.correctionKind === "reversal" && row.linkedTo !== null ? [row.linkedTo] : [],
		),
	)
	const accountsOf = new Map(
		ledger.transactions.map((tx) => [
			tx.id as string,
			new Set(tx.postings.map((posting) => posting.accountId as string)),
		]),
	)
	return rows
		.filter(
			(row) =>
				row.memo?.startsWith(MEMO_PREFIX) === true &&
				row.correctionKind !== "reversal" &&
				!withdrawn.has(row.id),
		)
		.map((row) => ({ row, accountIds: accountsOf.get(row.id) ?? new Set<string>() }))
		.sort((a, b) =>
			a.row.date === b.row.date
				? a.row.id.localeCompare(b.row.id)
				: a.row.date.localeCompare(b.row.date),
		)
}

/** The stored valuations of one account dated after `date`, earliest first. */
export function laterValuations(
	stored: readonly StoredValuation[],
	accountId: string,
	date: string,
): StoredValuation[] {
	return stored.filter((entry) => entry.row.date > date && entry.accountIds.has(accountId))
}

/** The sentence a write carries when it moves valuations stated after it. */
export function laterNote(input: {
	account: string
	date: string
	difference: string
	later: readonly StoredValuation[]
	becomes: string
}): string {
	const [first, ...others] = input.later
	if (first === undefined) return ""
	const stated = first.row.memo?.slice(MEMO_PREFIX.length) ?? ""
	const more =
		others.length === 0
			? ""
			: ` ${others.length} more later ${others.length === 1 ? "valuation moves" : "valuations move"} by the same amount.`
	return (
		`"${input.account}" has a later valuation: ${first.row.date}, valued at ${stated} (transaction ${first.row.id}). ` +
		`This write moves its balance by ${input.difference} from ${input.date} on, so on ${first.row.date} it becomes ${input.becomes} ` +
		`and that valuation no longer holds; value it again on ${first.row.date} to restate it.${more}`
	)
}

/**
 * The note a write carries when stored valuations of the account are dated after it: it names the
 * earliest and says what the Balance on its date becomes, read from the Ledger with this write in.
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
	const later = laterValuations(input.stored, account.id, input.date)
	const first = later[0]
	if (first === undefined) return []
	const after = balanceAt(input.transactions, account.id, first.row.date, ledger.chart).amount
	const money = (amount: number) => formatMinorUnits(amount, account.currency)
	const becomes = account.type === "liability" ? 0 - after : after
	return [
		laterNote({
			account: account.name,
			date: input.date,
			difference: money(input.difference),
			later,
			becomes: money(becomes),
		}),
	]
}
