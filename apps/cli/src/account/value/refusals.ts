import { type AppError, fail } from "../../errors"
import type { AccountRow } from "../../store"

/** The sentence every `--against` refusal ends on: what to name, or how to make one. */
const AGAINST_HINT =
	'Name an income or equity account in the same currency, or create one with "traj account add Market gains --type income --currency THB".'

export type AgainstReason = "type" | "header" | "currency"

const AGAINST_SENTENCES: Record<AgainstReason, (account: AccountRow, valued?: string) => string> = {
	type: (account) => `is ${account.type}, not an income or equity account`,
	header: () => "is a header account and takes no postings",
	currency: (account, valued) => `is in ${account.currency}, not the valued account's ${valued}`,
}

/** The account a valuation is posted against cannot take it; the reason names which rule. */
export function againstInvalid(
	account: AccountRow,
	reason: AgainstReason,
	path: string,
	valuedCurrency?: string,
): AppError {
	return fail("valuation_against_invalid", {
		path,
		message: `${path}: "${account.name}" ${AGAINST_SENTENCES[reason](account, valuedCurrency)}`,
		hint: AGAINST_HINT,
		details: {
			account: { id: account.id, name: account.name },
			type: account.type,
			currency: account.currency,
			reason,
		},
	})
}

/** The account to value is an income, expense or equity account: it has no value to state. */
export function accountInvalid(account: AccountRow, path: string): AppError {
	return fail("valuation_account_invalid", {
		path,
		message: `${path}: "${account.name}" is ${account.type}, and only an asset or a liability has a value to state`,
		hint: 'Record income and spending with "traj tx add"; a valuation states what an asset is worth or what a liability still owes.',
		details: { account: { id: account.id, name: account.name }, type: account.type },
	})
}

/**
 * A negative value for a liability: `traj balance` shows one as negative, so a copied figure would
 * state the debt twice over. The value is what it owes, positive, and is refused rather than flipped.
 */
export function negativeLiability(account: AccountRow, value: string, path: string): AppError {
	return fail("valuation_value_negative", {
		path,
		message: `${path}: "${account.name}" is a liability, so its value is what it still owes, not ${value}`,
		hint: "State what the liability still owes as a positive amount, such as 800.00.",
		details: { account: { id: account.id, name: account.name }, value },
	})
}

/** An account to value, or the one to post against, is archived and takes no postings. */
export function archivedAccount(account: AccountRow, path: string): AppError {
	return fail("account_archived", {
		path,
		message: `${path}: "${account.name}" is archived and accepts no postings`,
		details: { accountId: account.id, archivedAt: account.archivedAt },
	})
}

/** The account to value is a header: only a leaf has a Balance of its own. */
export function headerAccount(account: AccountRow, path: string): AppError {
	return fail("NON_LEAF_ACCOUNT", {
		path,
		message: `${path}: "${account.name}" is a header account; value one of its leaf accounts`,
		hint: 'Run "traj account show" to see its children.',
		details: { field: path, value: account.id, reason: "is a header account" },
	})
}
