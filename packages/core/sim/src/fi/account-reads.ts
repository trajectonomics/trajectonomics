import { compareIds } from "../engine/order"
import { accountRefsOf } from "../levy/refs"
import type { Scenario } from "../types"
import { isDerived } from "../types"

/** The Accounts the Scenario's Derived amounts read, each once, in id order: what a walk records. */
export function readAccounts(scenario: Scenario): readonly string[] {
	const ids = new Set<string>()
	for (const flow of scenario.flows) {
		if (isDerived(flow)) for (const id of accountRefsOf(flow.derive)) ids.add(id)
	}
	return [...ids].sort(compareIds)
}
