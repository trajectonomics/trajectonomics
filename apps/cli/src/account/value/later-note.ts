import { statedAmount } from "@trajectonomics/core/ledger"
import { type AccountRow, formatMinorUnits } from "../../store"
import type { StoredValuation } from "./later"

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
 * earliest and says what the value on its date becomes. `later` is the account's stored valuations
 * dated after this write (`laterValuations`), and `balanceAt` reads its signed Balance on a date
 * with this write in.
 */
export function laterNotes(input: {
	account: AccountRow
	date: string
	difference: number
	later: readonly StoredValuation[]
	balanceAt: (asOf: string) => number
}): string[] {
	const { account, later } = input
	const first = later[0]
	if (first === undefined) return []
	const after = input.balanceAt(first.row.date)
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
