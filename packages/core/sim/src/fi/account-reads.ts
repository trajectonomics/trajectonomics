import { compareIds } from "../engine/order"
import { accountRefsOf } from "../levy/refs"
import type { Flow, Scenario } from "../types"
import { isDerived, isRuled } from "../types"

function readsOf(flow: Flow): readonly string[] {
	if (isDerived(flow)) return accountRefsOf(flow.derive)
	return isRuled(flow) ? flow.rule.portfolio : []
}

/** The Accounts the Scenario's Derived amounts and Spending rules read, each once, in id order: what a walk records. */
export function readAccounts(scenario: Scenario): readonly string[] {
	const ids = new Set<string>()
	for (const flow of scenario.flows) for (const id of readsOf(flow)) ids.add(id)
	return [...ids].sort(compareIds)
}
