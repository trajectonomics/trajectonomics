import { type AppError, fail } from "../errors"
import { UNKNOWN_ACCOUNT_HINT } from "../hint"

/**
 * A posting names an account outside the chart. It is the core's `UNKNOWN_ACCOUNT` at exit 3,
 * never `not_found`: the transaction is the command's target, the account is one of its postings.
 */
export function unknownAccount(ref: string, path: string): AppError {
	const reason = "is not in the chart of accounts"
	return fail("UNKNOWN_ACCOUNT", {
		path,
		message: `${path}: no account matches "${ref}"`,
		hint: UNKNOWN_ACCOUNT_HINT,
		details: { field: path, value: ref, reason },
	})
}

/**
 * A transfer names one Account on both sides. It moves no balance and is almost always a slip, so
 * the CLI refuses it at exit 3 (`same_account`) in every form that maps `from` and `to`.
 */
export function sameAccount(account: { id: string; name: string }, path: string): AppError {
	return fail("same_account", {
		path,
		message: `${path}: "${account.name}" is both the from and the to account`,
		hint: "Name two different accounts in --from and --to; a transfer from an account to itself moves nothing.",
		details: { account: { id: account.id, name: account.name } },
	})
}

/** `tx show` found no transaction with this id: a lookup miss at exit 4 (ADR-0021). */
export function transactionNotFound(id: string): AppError {
	return fail("not_found", {
		message: `No transaction matches "${id}".`,
		details: { resource: "transaction" },
		hint: 'Run "traj tx list" to see the ledger.',
	})
}
