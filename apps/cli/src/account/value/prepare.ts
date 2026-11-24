import { accountId } from "@trajectonomics/core/ledger"
import { checkedDate } from "../../date"
import { type AppError, fail, isAppError } from "../../errors"
import { type AccountRow, type Ledger, parseMinorUnits } from "../../store"
import { unknownAccount } from "../../tx/errors"
import type { ValueEntry } from "./document"
import { accountInvalid, againstInvalid, archivedAccount, headerAccount } from "./refusals"
import type { Positioned, Prepared, Refusal, ValueRequest } from "./types"

const STATED_TYPES: ReadonlySet<string> = new Set(["asset", "liability"])
const AGAINST_TYPES: ReadonlySet<string> = new Set(["income", "equity"])

/** The live account a name or an id names; an id is read first, as `account show` does. */
export function find(ledger: Ledger, ref: string): AccountRow | undefined {
	return ledger.accounts.find((a) => a.id === ref) ?? ledger.accounts.find((a) => a.name === ref)
}

/** The account every difference is posted against, or the refusal that says why it cannot be. */
export function againstOf(ledger: Ledger, request: ValueRequest): AccountRow | AppError {
	const against = find(ledger, request.against)
	if (against === undefined) return unknownAccount(request.against, request.againstPath)
	if (against.archivedAt !== null) return archivedAccount(against, request.againstPath)
	if (!ledger.chart.isLeaf(accountId(against.id))) {
		return againstInvalid(against, "header", request.againstPath)
	}
	if (!AGAINST_TYPES.has(against.type)) return againstInvalid(against, "type", request.againstPath)
	return against
}

/** The account to value: a live, unarchived asset or liability leaf. */
function valuedOf(ledger: Ledger, ref: string, path: string): AccountRow | AppError {
	const account = find(ledger, ref)
	if (account === undefined) return unknownAccount(ref, path)
	if (!STATED_TYPES.has(account.type)) return accountInvalid(account, path)
	if (account.archivedAt !== null) return archivedAccount(account, path)
	if (!ledger.chart.isLeaf(accountId(account.id))) return headerAccount(account, path)
	return account
}

function prepare(
	ledger: Ledger,
	against: AccountRow,
	entry: Positioned,
	request: ValueRequest,
): Prepared | AppError {
	const at = (field: keyof ValueEntry) => request.path(entry.index, field)
	const account = valuedOf(ledger, entry.account, at("account"))
	if (isAppError(account)) return account
	if (account.currency !== against.currency) {
		return againstInvalid(against, "currency", request.againstPath, account.currency)
	}
	const date = checkedDate(entry.date, at("date"))
	if (isAppError(date)) return date
	const value = parseMinorUnits(entry.value, account.currency, at("value"))
	if (isAppError(value)) return value
	return { index: entry.index, account, date, value }
}

function repeated(first: Prepared, second: Prepared, request: ValueRequest): AppError {
	const path = request.path(second.index, "date")
	return fail("invalid_input", {
		path,
		message: `${path}: "${second.account.name}" already has a value on ${second.date} at entry ${first.index}`,
		hint: "State one value per account and date.",
	})
}

/** Prepares every entry; a refused one is listed and the rest still run, so a batch lists them all. */
export function prepareAll(
	ledger: Ledger,
	against: AccountRow,
	request: ValueRequest,
): { ready: Prepared[]; refused: Refusal[] } {
	const ready: Prepared[] = []
	const refused: Refusal[] = []
	const seen = new Map<string, Prepared>()
	for (const entry of request.entries) {
		const one = prepare(ledger, against, entry, request)
		const first = isAppError(one) ? undefined : seen.get(`${one.account.id}|${one.date}`)
		if (isAppError(one)) refused.push({ index: entry.index, error: one })
		else if (first !== undefined)
			refused.push({ index: entry.index, error: repeated(first, one, request) })
		else {
			seen.set(`${one.account.id}|${one.date}`, one)
			ready.push(one)
		}
	}
	return { ready, refused }
}

/** Date order, then account id order; two entries that tie keep the order they were listed in. */
export function inApplyOrder(ready: readonly Prepared[]): Prepared[] {
	return [...ready].sort(
		(a, b) =>
			a.date.localeCompare(b.date) || a.account.id.localeCompare(b.account.id) || a.index - b.index,
	)
}
