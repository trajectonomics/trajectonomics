import type { AccountNames } from "../account-names"

const CASH = "cash:"
const ACCOUNT = "account:"
const NO_CATEGORY = "no category"

function bare(id: string): string {
	return id.startsWith(ACCOUNT) ? id.slice(ACCOUNT.length) : id
}

function cashFields(seriesId: string): unknown[] | null {
	if (!seriesId.startsWith(CASH)) return null
	try {
		const parsed: unknown = JSON.parse(seriesId.slice(CASH.length))
		return Array.isArray(parsed) ? parsed : null
	} catch {
		return null
	}
}

/**
 * The item a cash-flow series names (`cash:[group, id, account, category]`): the Flow or category id, else the
 * Account, else "no category". Any other series answers its own id (web ADR 0029).
 */
export function seriesLabelId(seriesId: string): string {
	const fields = cashFields(seriesId)
	if (fields === null) return seriesId.startsWith(CASH) ? NO_CATEGORY : bare(seriesId)
	const [, itemId, account] = fields
	if (typeof itemId === "string") return bare(itemId)
	if (typeof account === "string") return bare(account)
	return NO_CATEGORY
}

/** How a series' category reads, or null when it states none. A real category named like the none words is quoted. */
export function seriesCategory(seriesId: string): string | null {
	const fields = cashFields(seriesId)
	if (fields === null) return null
	if (typeof fields[3] !== "string") return NO_CATEGORY
	return fields[3] === NO_CATEGORY ? `"${NO_CATEGORY}"` : fields[3]
}

/** The Account a series names, by the ledger's name for it, else its id, or null when it names none. */
export function seriesAccount(seriesId: string, accounts: AccountNames): string | null {
	const account = cashFields(seriesId)?.[2]
	if (typeof account !== "string") return null
	return accounts.get(account) ?? bare(account)
}

/** A series no plan states, in words built from its id: its item and its category, never its key (web ADR 0029). */
export function seriesWords(seriesId: string): string {
	const category = seriesCategory(seriesId)
	const label = seriesLabelId(seriesId)
	return category === null ? label : `${label} (${category})`
}
