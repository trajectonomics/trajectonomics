import { COMPOUNDING_PERIODS, ROUNDINGS } from "../vocab"
import type { Check, Emit, Path } from "./codes"
import { isValidDate } from "./date"
import { milestoneRef } from "./flow-gates"
import { tallyLabel } from "./levy-fields"
import { prepayments } from "./prepayments"
import { boundedInt, date, oneOf } from "./scalars"
import { checkShape, type Field, isRecord, opt, req, type Shape } from "./shape"

/** What a payout may name: the Levies its label and shares need, and the Milestones that gate it. */
export interface PayoutContext {
	readonly hasLevy: boolean
	readonly levyIds: ReadonlySet<string>
	readonly milestoneIds: ReadonlySet<string>
}

/** The Flow id an Account's payout takes, so no declared Flow may carry it (ADR 0027). */
export function payoutFlowId(account: string): string {
	return `payout:${account}`
}

function shapeOf(context: PayoutContext): Shape {
	const gate = milestoneRef(context.milestoneIds)
	return {
		bps: req(boundedInt(0, 10_000, "RATE_OUT_OF_RANGE")),
		frequency: req(oneOf(COMPOUNDING_PERIODS, "INVALID_FREQUENCY")),
		rounding: req(oneOf(ROUNDINGS, "INVALID_ROUNDING")),
		start: opt(date),
		end: opt(date),
		startAt: opt(gate),
		endAt: opt(gate),
		label: tallyLabel(context.hasLevy),
		prepayments: prepayments(context.hasLevy, context.levyIds),
	}
}

/** The `payout` field of an asset Account: its shape, then `end` against `start`. */
export function payoutField(context: PayoutContext): Field {
	const check: Check = (value, path, emit) => {
		const payout = checkShape(value, path, shapeOf(context), emit)
		if (payout === undefined) return
		const { start, end } = payout
		if (isValidDate(start) && isValidDate(end) && end < start) {
			emit("END_BEFORE_START", [...path, "end"])
		}
	}
	return opt(check)
}

/**
 * What a payout means on the Account that carries it: an Illiquid asset may not (`PAYOUT_ILLIQUID`), a
 * liability may not (`LIABILITY_MISUSE`), and its `label` may not sit beside `returnLabel`, which already
 * tallies the same money as growth (`CONFLICTING_LABELS`).
 */
export function checkPayoutRules(
	rule: Readonly<Record<string, unknown>>,
	path: Path,
	emit: Emit,
): void {
	const payout = rule["payout"]
	if (!Object.hasOwn(rule, "payout")) return
	if (rule["kind"] === "liability") return void emit("LIABILITY_MISUSE", [...path, "payout"])
	if (rule["liquid"] === false) emit("PAYOUT_ILLIQUID", [...path, "payout"])
	if (isRecord(payout) && Object.hasOwn(payout, "label") && Object.hasOwn(rule, "returnLabel")) {
		emit("CONFLICTING_LABELS", [...path, "payout", "label"])
	}
}

/** The id of an Account that pays out: one with a payout above 0 bps (a payout of 0 bps is none, ADR 0027). */
export function payingAccountId(account: unknown): string | undefined {
	if (!isRecord(account) || typeof account["id"] !== "string") return undefined
	const payout = account["payout"]
	return isRecord(payout) && typeof payout["bps"] === "number" && payout["bps"] > 0
		? account["id"]
		: undefined
}

/** Reports a declared Flow that carries the id an Account's payout takes. */
export function checkPayoutIds(accounts: unknown, flows: unknown, path: Path, emit: Emit): void {
	if (!Array.isArray(accounts) || !Array.isArray(flows)) return
	const taken = new Set<string>()
	for (const account of accounts) {
		const id = payingAccountId(account)
		if (id !== undefined) taken.add(payoutFlowId(id))
	}
	for (let index = 0; index < flows.length; index++) {
		const flow: unknown = flows[index]
		if (isRecord(flow) && typeof flow["id"] === "string" && taken.has(flow["id"])) {
			emit("DUPLICATE_ID", [...path, "flows", index, "id"])
		}
	}
}
