import { ACCOUNT_KINDS, COMPOUNDING_PERIODS } from "../vocab"
import type { AccountIndex, Check, Emit, Path } from "./codes"
import { tallyLabel } from "./levy-fields"
import { checkPayoutRules, type PayoutContext, payoutField } from "./payout"
import { bool, date, oneOf, safeInt, str } from "./scalars"
import { checkShape, checkUnique, isRecord, list, opt, req, type Shape } from "./shape"

const LABEL_KEYS = ["returnLabel", "gainLabel"] as const

/** Keys an asset may carry and a liability may not. */
const ASSET_ONLY_KEYS = ["lockedUntil", "liquid"] as const

/** A valid compounding period, so the nominal-rate rule knows whether to apply. */
function isCompoundingPeriod(value: unknown): boolean {
	return typeof value === "string" && COMPOUNDING_PERIODS.some((period) => period === value)
}

function shapeOf(context: PayoutContext): Shape {
	const { hasLevy } = context
	return {
		id: req(str),
		kind: req(oneOf(ACCOUNT_KINDS, "INVALID_KIND")),
		rate: req(safeInt),
		compounding: opt(oneOf(COMPOUNDING_PERIODS, "INVALID_COMPOUNDING")),
		lockedUntil: opt(date),
		liquid: opt(bool),
		returnLabel: tallyLabel(hasLevy),
		gainLabel: tallyLabel(hasLevy),
		payout: payoutField(context),
	}
}

/**
 * One rate problem at most: a nominal Account's rate is non-negative, an effective annual one
 * keeps the `-9999` floor. An absent or invalid `compounding` never applies the nominal floor.
 */
function checkRate(value: unknown, path: Path, emit: Emit): void {
	const record = isRecord(value) ? value : {}
	const rate = record["rate"]
	if (typeof rate !== "number" || !Number.isSafeInteger(rate)) return
	const floor = isCompoundingPeriod(record["compounding"]) ? 0 : -9999
	if (rate < floor) emit("RATE_OUT_OF_RANGE", [...path, "rate"])
}

function presentLabels(rule: Readonly<Record<string, unknown>>): readonly string[] {
	return LABEL_KEYS.filter((key) => Object.hasOwn(rule, key))
}

/** A label is meaningless on a liability, and one Account may not accrue returns and gains at once. */
function checkLabelRules(rule: Readonly<Record<string, unknown>>, path: Path, emit: Emit): void {
	const present = presentLabels(rule)
	if (rule["kind"] === "liability") {
		for (const key of present) emit("LIABILITY_MISUSE", [...path, key])
	}
	if (rule["kind"] === "asset" && present.length === 2) {
		emit("CONFLICTING_LABELS", [...path, "gainLabel"])
	}
}

/** An asset-only key is a misuse on a liability, whatever its value. */
function checkAssetOnlyKeys(checked: Readonly<Record<string, unknown>>, path: Path, emit: Emit) {
	if (checked["kind"] !== "liability") return
	for (const key of ASSET_ONLY_KEYS) {
		if (Object.hasOwn(checked, key)) emit("LIABILITY_MISUSE", [...path, key])
	}
}

const account =
	(context: PayoutContext): Check =>
	(value, path, emit) => {
		const checked = checkShape(value, path, shapeOf(context), emit)
		if (checked === undefined) return
		checkAssetOnlyKeys(checked, path, emit)
		checkPayoutRules(checked, path, emit)
		if (context.hasLevy) checkLabelRules(checked, path, emit)
		checkRate(value, path, emit)
	}

export function checkAccounts(
	value: unknown,
	path: Path,
	emit: Emit,
	context: PayoutContext,
): void {
	list(account(context))(value, path, emit)
	checkUnique(value, path, "id", emit)
}

/**
 * Declared account ids (first declaration wins) mapped to their raw `kind`. `undefined` when
 * `accounts` is not an array, so reference checks are skipped rather than flooding the output.
 */
export function indexAccounts(accounts: unknown): AccountIndex | undefined {
	if (!Array.isArray(accounts)) return undefined
	const index = new Map<string, unknown>()
	for (let i = 0; i < accounts.length; i++) {
		const item: unknown = accounts[i]
		if (isRecord(item) && typeof item["id"] === "string" && !index.has(item["id"])) {
			index.set(item["id"], item["kind"])
		}
	}
	return index
}

/** Ids of the asset Accounts marked `liquid: false`; a malformed entry is skipped, not reported here. */
export function illiquidAccountIds(accounts: unknown): ReadonlySet<string> {
	const ids = new Set<string>()
	if (!Array.isArray(accounts)) return ids
	for (const item of accounts) {
		if (isRecord(item) && item["kind"] === "asset" && item["liquid"] === false) {
			if (typeof item["id"] === "string") ids.add(item["id"])
		}
	}
	return ids
}
