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

/**
 * A buffer finding a walk keeps rather than acts on: a Minimum buffer breach, or a window that
 * cannot be priced. A Shortfall outranks it; among findings, the earliest date wins.
 */
export type BufferFinding =
	| { readonly kind: "breach"; readonly breach: BufferBreach }
	| { readonly kind: "problem"; readonly problem: ProjectionProblem }

/** One day's buffer check: a finding, a valuation problem that stops the walk, or nothing. */
export type BufferCheck =
	| { readonly kind: "ok" }
	| { readonly kind: "finding"; readonly finding: BufferFinding }
	| { readonly kind: "problem"; readonly problem: ProjectionProblem }

/** Checks accessible net worth after `date`'s flows against a full twelve-month expense window. */
export function checkBuffer(
	states: StateMap,
	date: DateString,
	table: RequirementTable,
): BufferCheck {
	const valued = accessibleAfter(states, date)
	if (valued.kind === "problem") return { kind: "problem", problem: valued.problem }
	const checked = breachAt(table, date, valued.accessible)
	if (checked.kind === "ok") return checked
	return {
		kind: "finding",
		finding:
			checked.kind === "breach"
				? { kind: "breach", breach: checked.breach }
				: { kind: "problem", problem: checked.problem },
	}
}
