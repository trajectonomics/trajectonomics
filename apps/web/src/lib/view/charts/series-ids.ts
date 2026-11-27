import type { AccountNames } from "../account-names"

const CASH = "cash:"
const ACCOUNT = "account:"
const NO_CATEGORY = "no category"

/** The word each cash-flow group names its series by, as `resolve-flows.ts` does. */
const GROUP_WORDS: Readonly<Record<string, string>> = {
	income: "Income",
	expense: "Expense",
	category: "Spending on",
	contribution: "Saving",
	withdrawal: "Withdrawal",
}

/** The word a cash-flow group names its Account by, as its drawn line does. */
const ACCOUNT_WORDS: Readonly<Record<string, string>> = {
	contribution: "into",
	withdrawal: "from",
}

const TAX = "tax:"
const RULE = "rule:"

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

/** A tax series' words, as `resolve-later.ts` names one. */
function taxWords(seriesId: string): string | null {
	if (!seriesId.startsWith(TAX)) return null
	const [levy, kind] = seriesId.slice(TAX.length).split(":")
	if (levy === undefined || kind === undefined) return null
	if (kind === "due") return `Tax due, ${levy}`
	return kind === "taxable" ? `Taxable income, ${levy}` : null
}

/** A spending-rule series' words, as `resolve-later.ts` names one. */
function ruleWords(seriesId: string): string | null {
	return seriesId.startsWith(RULE)
		? `Paid by the spending rule ${seriesId.slice(RULE.length)}`
		: null
}

/** A series no plan states, in words built from its id: its group, item, category and Account, never its key. */
export function seriesWords(seriesId: string, accounts: AccountNames = new Map()): string {
	const fields = cashFields(seriesId)
	if (seriesId.startsWith(CASH) && fields === null) return NO_CATEGORY
	if (fields === null) return taxWords(seriesId) ?? ruleWords(seriesId) ?? bare(seriesId)
	const group = typeof fields[0] === "string" ? fields[0] : ""
	const prefix = GROUP_WORDS[group]
	const label = seriesLabelId(seriesId)
	const item = fields[1] === NO_CATEGORY ? `"${label}"` : label
	const category = seriesCategory(seriesId)
	const base = `${prefix === undefined ? "" : `${prefix}: `}${item}${category === null ? "" : ` (${category})`}`
	return withAccount(base, group, seriesId, accounts)
}

/** The words followed by the Account a contribution moves into or a withdrawal moves from, when it names one. */
function withAccount(
	base: string,
	group: string,
	seriesId: string,
	accounts: AccountNames,
): string {
	const word = ACCOUNT_WORDS[group]
	const account = word === undefined ? null : seriesAccount(seriesId, accounts)
	return account === null ? base : `${base} ${word} ${account}`
}
