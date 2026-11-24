import { FLOW_KINDS, FREQUENCIES, FUNDINGS } from "../vocab"
import type { AccountIndex } from "./codes"
import { derive } from "./derive"
import { cappedPrepayment, expenseCategory, label, NOT_ALLOWED, NOT_EXPENSE } from "./flow-fields"
import { gates } from "./flow-gates"
import { levelField } from "./level-loan"
import type { LoanIndex } from "./loan-index"
import { prepayments } from "./prepayments"
import { accountRef } from "./refs"
import { spendingRule } from "./rule"
import { amount, bool, date, growth, oneOf, str } from "./scalars"
import { opt, req, type Shape } from "./shape"
import { transferShape } from "./transfer"

/** What a Flow's fields may reference: the Accounts, the Levies a label or share needs, and Milestones. */
export interface FlowContext {
	readonly accounts: AccountIndex | undefined
	readonly hasLevy: boolean
	readonly levyIds: ReadonlySet<string>
	readonly milestoneIds: ReadonlySet<string>
	/** The raw loan fields of each declared Account, for a withdrawal source and a level payment. */
	readonly loans: LoanIndex
	/** The asset Accounts marked `liquid: false`, which a Spending rule's portfolio refuses. */
	readonly illiquid: ReadonlySet<string>
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

/**
 * Keys allowed per flow kind; an invalid kind accepts every optional kind-specific key.
 * `label`, `prepayments` and `cappedPrepayment` need a Levy in the Scenario (`hasLevy`).
 */
export function flowShape(kind: unknown, context: FlowContext): Shape {
	const target = accountRef(context.accounts)
	const shared = { ...base, ...gates(context), rule: NOT_EXPENSE }
	const levied = {
		label: label(context.hasLevy),
		prepayments: prepayments(context.hasLevy, context.levyIds),
	}
	const capped = cappedPrepayment(context.hasLevy)
	if (kind === "income")
		return {
			...shared,
			earned: req(bool),
			...levied,
			cappedPrepayment: capped,
			funding: NOT_ALLOWED,
			level: NOT_ALLOWED,
		}
	if (kind === "contribution") {
		return {
			...shared,
			target: req(target),
			funding: opt(oneOf(FUNDINGS, "INVALID_FUNDING")),
			label: label(context.hasLevy),
			prepayments: NOT_ALLOWED,
			cappedPrepayment: NOT_ALLOWED,
			level: levelField,
		}
	}
	if (kind === "expense") {
		return {
			...shared,
			rule: opt(spendingRule(context)),
			category: opt(expenseCategory),
			funding: NOT_ALLOWED,
			label: NOT_ALLOWED,
			prepayments: NOT_ALLOWED,
			cappedPrepayment: NOT_ALLOWED,
			level: NOT_ALLOWED,
		}
	}
	if (kind === "transfer") return transferShape(shared, context)
	if (kind === "withdrawal") {
		return {
			...shared,
			source: req(accountRef(context.accounts)),
			funding: NOT_ALLOWED,
			label: NOT_ALLOWED,
			prepayments: NOT_ALLOWED,
			cappedPrepayment: NOT_ALLOWED,
			level: NOT_ALLOWED,
		}
	}
	return {
		...shared,
		rule: opt(spendingRule(context)),
		category: opt(expenseCategory),
		earned: opt(bool),
		target: opt(target),
		funding: opt(oneOf(FUNDINGS, "INVALID_FUNDING")),
		...levied,
		cappedPrepayment: capped,
		level: levelField,
	}
}
