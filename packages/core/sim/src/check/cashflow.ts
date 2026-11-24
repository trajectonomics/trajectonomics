import type { AccountIndex, Check, Emit, Path } from "./codes"
import { spendableRef } from "./refs"
import { boundedInt, routed } from "./scalars"
import { checkShape, checkUnique, checkUniqueValues, isRecord, list, opt, req } from "./shape"
import { checkFloorOrder } from "./withdraw-floor"

const share: Check = boundedInt(1, 10_000, "RATE_OUT_OF_RANGE")

function checkRouting(cashflow: Readonly<Record<string, unknown>>, path: Path, emit: Emit): void {
	const surplus = cashflow["surplus"]
	if (!Array.isArray(surplus)) return
	if (surplus.length === 0) {
		emit("SURPLUS_UNROUTED", [...path, "surplus"])
		return
	}
	const at = surplus.length - 1
	const last = surplus[at]
	if (isRecord(last) && Object.hasOwn(last, "upTo"))
		emit("SURPLUS_UNROUTED", [...path, "surplus", at, "upTo"])
	if (isRecord(last) && Object.hasOwn(last, "share"))
		emit("SURPLUS_SHARE_LAST", [...path, "surplus", at, "share"])
}

/** A withdrawal entry: an Account id, or `{ account, downTo }` that keeps a Reserve floor (ADR 0030). */
function entry(account: Check): Check {
	return (value, at, emit) => {
		if (!isRecord(value)) return account(value, at, emit)
		checkShape(value, at, { account: req(account), downTo: req(routed) }, emit)
	}
}

export function checkCashflow(
	value: unknown,
	path: Path,
	accounts: AccountIndex | undefined,
	emit: Emit,
): void {
	const account = spendableRef(accounts)
	const step: Check = (item, at, e) =>
		void checkShape(item, at, { account: req(account), upTo: opt(routed), share: opt(share) }, e)
	const cashflow = checkShape(
		value,
		path,
		{
			surplus: req(list(step)),
			contribute: req(list(account)),
			withdraw: req(list(entry(account))),
		},
		emit,
	)
	if (cashflow) checkRouting(cashflow, path, emit)
	checkUnique(cashflow?.["surplus"], [...path, "surplus"], "account", emit)
	checkUniqueValues(cashflow?.["contribute"], [...path, "contribute"], emit)
	checkFloorOrder(cashflow?.["withdraw"], [...path, "withdraw"], emit)
}
