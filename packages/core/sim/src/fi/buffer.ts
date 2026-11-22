import { snapshot } from "../engine/snapshot"
import type { StateMap } from "../engine/state"
import type { DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { type RequirementTable, requirement } from "./required"

export interface BufferBreach {
	readonly date: DateString
	readonly required: bigint
	readonly accessible: bigint
}

export type BufferOutcome =
	| { readonly kind: "ok" }
	| { readonly kind: "breach"; readonly breach: BufferBreach }
	| { readonly kind: "problem"; readonly problem: ProjectionProblem }

/** The accessible net worth after `date`'s flows, or why it cannot be valued. */
export type Accessible =
	| { readonly kind: "ok"; readonly accessible: bigint }
	| { readonly kind: "problem"; readonly problem: ProjectionProblem }

export function accessibleAfter(states: StateMap, date: DateString): Accessible {
	const valued = snapshot(states, date)
	if (valued.problem !== undefined) return { kind: "problem", problem: valued.problem }
	return { kind: "ok", accessible: valued.snapshot!.accessibleNetWorth }
}

/** Compares an accessible net worth with the Minimum buffer `date` requires. */
export function breachAt(
	table: RequirementTable,
	date: DateString,
	accessible: bigint,
): BufferOutcome {
	const needed = requirement(table, date)
	if (needed.kind === "problem") return needed
	if (accessible < needed.required) {
		return { kind: "breach", breach: { date, required: needed.required, accessible } }
	}
	return { kind: "ok" }
}

/** Checks accessible net worth after `date`'s flows against a full twelve-month expense window. */
export function checkBuffer(
	states: StateMap,
	date: DateString,
	table: RequirementTable,
): BufferOutcome {
	const needed = requirement(table, date)
	if (needed.kind === "problem") return needed
	const valued = accessibleAfter(states, date)
	if (valued.kind === "problem") return valued
	return breachAt(table, date, valued.accessible)
}
