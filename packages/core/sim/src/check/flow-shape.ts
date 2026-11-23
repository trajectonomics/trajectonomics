import { FLOW_KINDS, FREQUENCIES } from "../vocab"
import type { AccountIndex, Check } from "./codes"
import { derive } from "./derive"
import { cappedPrepayment, label, NOT_ALLOWED } from "./flow-fields"
import { levelField } from "./level-loan"
import type { LoanIndex } from "./loan-index"
import { prepayments } from "./prepayments"
import { accountRef } from "./refs"
import { amount, bool, date, growth, oneOf, str } from "./scalars"
import { opt, req, type Shape } from "./shape"

/** What a Flow's fields may reference: the Accounts, the Levies a label or share needs, and Milestones. */
export interface FlowContext {
	readonly accounts: AccountIndex | undefined
	readonly hasLevy: boolean
	readonly levyIds: ReadonlySet<string>
	readonly milestoneIds: ReadonlySet<string>
	/** The raw loan fields of each declared Account, for a withdrawal source and a level payment. */
	readonly loans: LoanIndex
}

/** A Milestone id a Flow gates on: a string that names a declared Milestone. */
function milestoneRef(ids: ReadonlySet<string>): Check {
	return (value, path, emit) => {
		if (typeof value !== "string") emit("WRONG_TYPE", path)
		else if (!ids.has(value)) emit("UNKNOWN_MILESTONE", path)
	}
}

const base: Shape = {
	id: req(str),
	kind: req(oneOf(FLOW_KINDS, "INVALID_KIND")),
	amount: opt(amount),
	frequency: req(oneOf(FREQUENCIES, "INVALID_FREQUENCY")),
	start: req(date),
	end: opt(date),
	growth: opt(growth),
	derive: opt(derive),
}

function gates(context: FlowContext): Shape {
	const ref = milestoneRef(context.milestoneIds)
	return { startAt: opt(ref), endAt: opt(ref) }
}

/**
 * Keys allowed per flow kind; an invalid kind accepts every optional kind-specific key.
 * `label`, `prepayments` and `cappedPrepayment` need a Levy in the Scenario (`hasLevy`).
 */
export function flowShape(kind: unknown, context: FlowContext): Shape {
	const target = accountRef(context.accounts)
	const shared = { ...base, ...gates(context) }
	const levied = {
		label: label(context.hasLevy),
		prepayments: prepayments(context.hasLevy, context.levyIds),
	}
	const capped = cappedPrepayment(context.hasLevy)
	if (kind === "income")
		return { ...shared, earned: req(bool), ...levied, cappedPrepayment: capped, level: NOT_ALLOWED }
	if (kind === "contribution") {
		return {
			...shared,
			target: req(target),
			label: label(context.hasLevy),
			prepayments: NOT_ALLOWED,
			cappedPrepayment: NOT_ALLOWED,
			level: levelField,
		}
	}
	if (kind === "expense") {
		return {
			...shared,
			label: NOT_ALLOWED,
			prepayments: NOT_ALLOWED,
			cappedPrepayment: NOT_ALLOWED,
			level: NOT_ALLOWED,
		}
	}
	if (kind === "withdrawal") {
		return {
			...shared,
			source: req(accountRef(context.accounts)),
			label: NOT_ALLOWED,
			prepayments: NOT_ALLOWED,
			cappedPrepayment: NOT_ALLOWED,
			level: NOT_ALLOWED,
		}
	}
	return {
		...shared,
		earned: opt(bool),
		target: opt(target),
		...levied,
		cappedPrepayment: capped,
		level: levelField,
	}
}
