import { ROUNDINGS } from "../vocab"
import type { AccountIndex, Check, Emit, Path } from "./codes"
import { amount, boundedInt, growth, oneOf, str } from "./scalars"
import { checkShape, checkUnique, isRecord, list, opt, req, type Shape } from "./shape"

const bps: Check = boundedInt(0, 10_000, "RATE_OUT_OF_RANGE")
const rounding: Check = oneOf(ROUNDINGS, "INVALID_ROUNDING")

/** One Account of a cost's `of`: declared, and an asset (a liability is a debt, never a base). */
function baseAccount(accounts: AccountIndex | undefined): Check {
	return (value, path, emit) => {
		if (typeof value !== "string") return str(value, path, emit)
		const kind = accounts?.get(value)
		if (accounts !== undefined && kind === undefined) emit("UNKNOWN_ACCOUNT", path)
		else if (kind === "liability") emit("ESTATE_ACCOUNT_LIABILITY", path)
	}
}

/** A non-empty list of distinct Account ids; an empty one is a missing key. */
function accountList(accounts: AccountIndex | undefined): Check {
	return (value, path, emit) => {
		list(baseAccount(accounts))(value, path, emit)
		if (!Array.isArray(value)) return
		if (value.length === 0) emit("MISSING_KEY", path)
		const seen = new Set<unknown>()
		for (let index = 0; index < value.length; index++) {
			if (seen.has(value[index])) emit("DUPLICATE_ID", [...path, index])
			seen.add(value[index])
		}
	}
}

/** A cost's `of`: `"gross"`, or the asset Accounts whose value it is a share of. */
function costBase(accounts: AccountIndex | undefined): Check {
	return (value, path, emit) => {
		if (value === "gross") return
		if (!isRecord(value)) return emit("INVALID_BASIS", path)
		checkShape(value, path, { accounts: req(accountList(accounts)) }, emit)
	}
}

const giftBase: Check = (value, path, emit) => {
	if (value !== "net") emit("INVALID_BASIS", path)
}

const FIXED: Shape = { id: req(str), amount: req(amount), growth: req(growth) }

/** A fixed line has `amount` or `growth`; anything else is a share, so its missing keys are named. */
function line(of: Check): Check {
	const share: Shape = { id: req(str), of: req(of), bps: req(bps), rounding: req(rounding) }
	return (value, path, emit) => {
		const fixed =
			isRecord(value) && (Object.hasOwn(value, "amount") || Object.hasOwn(value, "growth"))
		checkShape(value, path, fixed ? FIXED : share, emit)
	}
}

/** Ids of costs and gifts are unique together: a repeat in `gifts` after `costs` is a duplicate. */
function checkIds(block: Readonly<Record<string, unknown>>, path: Path, emit: Emit): void {
	for (const key of ["costs", "gifts"] as const) checkUnique(block[key], [...path, key], "id", emit)
	const costs = Array.isArray(block["costs"]) ? block["costs"] : []
	const taken = new Set(costs.map((cost) => (isRecord(cost) ? cost["id"] : undefined)))
	const gifts = Array.isArray(block["gifts"]) ? block["gifts"] : []
	for (let index = 0; index < gifts.length; index++) {
		const id = isRecord(gifts[index]) ? gifts[index]["id"] : undefined
		if (typeof id === "string" && id !== "" && taken.has(id)) {
			emit("DUPLICATE_ID", [...path, "gifts", index, "id"])
		}
	}
}

/** The Scenario's `estate` block (ADR 0025): cost and gift lines, ids unique across both. */
export function checkEstate(
	value: unknown,
	path: Path,
	accounts: AccountIndex | undefined,
	emit: Emit,
): void {
	const shape = {
		costs: opt(list(line(costBase(accounts)))),
		gifts: opt(list(line(giftBase))),
	}
	const block = checkShape(value, path, shape, emit)
	if (block !== undefined) checkIds(block, path, emit)
}
