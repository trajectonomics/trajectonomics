import { formatDate } from "../../format"
import type { AgainstChoice, SheetRow, ValueSheet } from "./types"

/** What a debt's field asks for: what is still owed, and not the negative Balance shown beside it. */
export const OWED_HINT =
	"Type what you still owe, as a positive number. The Balance above is shown negative, as the ledger holds it."

/** The line under a row's name: the date of its last Transaction, or why there is none to show. */
export function lastLine(row: SheetRow, since: string | null): string {
	if (row.lastDate !== null) return `Last transaction ${formatDate(row.lastDate)}`
	return since === null ? "No transaction loaded" : `No transaction since ${formatDate(since)}`
}

/** What a choice of the account to count against reads as: its name, and its currency. */
export function choiceLabel(choice: AgainstChoice): string {
	return `${choice.name} (${choice.currency})`
}

/** The footer's sentence: how many rows will be sent, and what they count against; or why nothing can be saved. */
export function footerLine(
	changed: number,
	against: AgainstChoice | null,
	noAccount = false,
): string {
	if (noAccount) return "Nothing can be saved until there is one account to count against."
	const rows = changed === 1 ? "1 account changed" : `${changed} accounts changed`
	return against === null
		? `${rows}. Choose an account to count the differences against.`
		: `${rows}. Differences count against ${against.name}.`
}

/** Whether the sheet has no account to count against, so it can only say how to make one. */
export function needsAgainstAccount(sheet: ValueSheet): boolean {
	return sheet.choices.length === 0
}
