import type { AccountNames } from "../account-names"

const ACCOUNT = "account:"
const TAX = "tax:"
const RULE = "rule:"

/** A removed Account's words: the ledger's name for it, else its id, so a UUID never stands where a name is known. */
function accountWords(seriesId: string, accounts: AccountNames): string | null {
	if (!seriesId.startsWith(ACCOUNT)) return null
	const id = seriesId.slice(ACCOUNT.length)
	return `Value of ${accounts.get(id) ?? id}`
}

/** A tax series' words, split at the last colon so a Levy that holds one still reads its words (`tax:a:b:due`). */
function taxWords(seriesId: string): string | null {
	if (!seriesId.startsWith(TAX)) return null
	const rest = seriesId.slice(TAX.length)
	const cut = rest.lastIndexOf(":")
	if (cut < 0) return `Tax, ${rest}`
	const levy = rest.slice(0, cut)
	const kind = rest.slice(cut + 1)
	if (kind === "due") return `Tax due, ${levy}`
	return kind === "taxable" ? `Taxable income, ${levy}` : `Tax, ${rest}`
}

/** A spending-rule series' words, as `resolve-later.ts` names one. */
function ruleWords(seriesId: string): string | null {
	if (!seriesId.startsWith(RULE)) return null
	return `Paid by the spending rule ${seriesId.slice(RULE.length)}`
}

/** A series that names no cash-flow line, in words built from its id, never its key (web ADR 0029). */
export function nonCashWords(seriesId: string, accounts: AccountNames): string | null {
	return taxWords(seriesId) ?? ruleWords(seriesId) ?? accountWords(seriesId, accounts)
}
