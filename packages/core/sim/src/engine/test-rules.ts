/** TEST-ONLY builders of rule Flows. */
import type { ExpenseFlow, SpendingRule } from "../types"
import type { FlowOptions } from "./test-flows"

/** An expense Flow whose yearly amount a Spending rule fixes from the portfolio (ADR 0023). */
export function ruledExpense(
	id: string,
	rule: SpendingRule,
	options: FlowOptions = {},
): ExpenseFlow {
	return {
		id,
		kind: "expense",
		frequency: options.frequency ?? "monthly",
		start: options.start ?? "2026-01-01",
		...(options.end === undefined ? {} : { end: options.end }),
		...(options.startAt === undefined ? {} : { startAt: options.startAt }),
		...(options.endAt === undefined ? {} : { endAt: options.endAt }),
		rule,
	}
}
