import { METRIC_NAMES, REFERENCE_WINDOWS } from "../vocab"
import type { AccountIndex, Check, Emit, Path } from "./codes"
import { oneOf } from "./scalars"
import { checkShape, isRecord, opt } from "./shape"

/** Each named Account must exist, and the Accounts of one list must all be of one kind. */
function checkAccountIds(
	value: readonly unknown[],
	path: Path,
	accounts: AccountIndex | undefined,
	emit: Emit,
): void {
	const kinds = new Set<unknown>()
	for (let index = 0; index < value.length; index++) {
		const id = value[index]
		if (typeof id !== "string") emit("WRONG_TYPE", [...path, index])
		else if (accounts === undefined) continue
		else if (!accounts.has(id)) emit("UNKNOWN_ACCOUNT", [...path, index])
		else kinds.add(accounts.get(id))
	}
	if (kinds.size > 1) emit("MIXED_METRIC_ACCOUNTS", path)
}

/** The `accounts` field of a `{ accounts }` Metric: a non-empty list of ids of one kind. */
function accountList(accounts: AccountIndex | undefined): Check {
	return (value, path, emit) => {
		if (!Array.isArray(value)) return emit("NOT_AN_ARRAY", path)
		if (value.length === 0) return emit("INVALID_METRIC", path)
		checkAccountIds(value, path, accounts, emit)
	}
}

/**
 * A Metric: one of the named balances, `{ accounts }` or `{ expenses }`. Exactly one of the two
 * object fields must be present, so the object form is never ambiguous.
 */
export function metricCheck(accounts: AccountIndex | undefined): Check {
	return (value, path, emit) => {
		if (typeof value === "string") {
			if (!METRIC_NAMES.some((name) => name === value)) emit("INVALID_METRIC", path)
			return
		}
		if (!isRecord(value)) return emit("INVALID_METRIC", path)
		const fields = checkShape(
			value,
			path,
			{
				accounts: opt(accountList(accounts)),
				expenses: opt(oneOf(REFERENCE_WINDOWS, "INVALID_METRIC")),
			},
			emit,
		)
		const present = ["accounts", "expenses"].filter((key) => Object.hasOwn(value, key))
		if (fields !== undefined && present.length !== 1) emit("INVALID_METRIC", path)
	}
}
