import type { Json } from "./overrides"
import { isOff, type WhatIf } from "./session"
import { withoutAddition, withoutItemChanges } from "./session-items"
import { switchedOff, switchedOnUnit, withTriedFields } from "./session-switch"
import { type TriedFlow, withTriedFlow } from "./try-flow"

/** One try of a salary: the salary and the employer share beside it, as the plan stores them and as the form made them. */
export type SalaryTry = {
	readonly id: string
	readonly shareId: string
	readonly salary: { readonly stored: Record<string, Json>; readonly edited: Record<string, Json> }
	/** The employer's Flow as the plan stores it (undefined for one the session adds), and as the form made it; null for none. */
	readonly employer: TriedFlow | null
	/** The stored share the form cleared, by its id, or null. */
	readonly dropped: string | null
	/** The path of a share the session added and the form cleared, or null. */
	readonly added: string | null
}

/**
 * The session with a salary tried as one unit: the salary and its employer share are switched on together, so an edit
 * in either section brings both back, and the try replaces any earlier one of either. A share the form cleared leaves,
 * and a share the session added leaves with it (no Removal of an item the plan does not hold).
 */
export function withTriedSalary(whatIf: WhatIf, tried: SalaryTry): WhatIf {
	// An edit in either section of a switched-off salary brings both back; a share cleared while the salary is on stays
	// cleared, unless the form states one.
	const base = isOff(whatIf, `flows.${tried.id}`)
		? switchedOnUnit(whatIf, tried.id, tried.shareId)
		: whatIf
	let next = withTriedFields(base, "flows", tried.id, tried.salary.stored, tried.salary.edited)
	if (tried.employer !== null) next = withTriedFlow(next, tried.employer)
	if (tried.dropped !== null) {
		next = switchedOff(withoutItemChanges(next, "flows", tried.dropped), `flows.${tried.dropped}`)
	}
	if (tried.employer === null && tried.added !== null) next = withoutAddition(next, tried.added)
	return next
}
