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
 * A window event a walk keeps rather than acts on: a Minimum buffer breach, or a window that cannot
 * be priced. A Shortfall outranks it; among events, the earliest date wins.
 */
export type WindowEvent =
	| { readonly kind: "breach"; readonly breach: BufferBreach }
	| { readonly kind: "problem"; readonly problem: ProjectionProblem }

/** One day's buffer check: a window event, a valuation problem that stops the walk, or nothing. */
export type BufferCheck =
	| { readonly kind: "ok" }
	| { readonly kind: "event"; readonly event: WindowEvent }
	| { readonly kind: "problem"; readonly problem: ProjectionProblem }

/** Checks accessible net worth after `date`'s flows against a full twelve-month expense window. */
export function checkBuffer(
	states: StateMap,
	date: DateString,
	table: RequirementTable,
): BufferCheck {
	const needed = requirement(table, date)
	if (needed.kind === "problem") {
		return { kind: "event", event: { kind: "problem", problem: needed.problem } }
	}
	const valued = accessibleAfter(states, date)
	if (valued.kind === "problem") return { kind: "problem", problem: valued.problem }
	const checked = breachAt(table, date, valued.accessible)
	return checked.kind === "breach"
		? { kind: "event", event: { kind: "breach", breach: checked.breach } }
		: { kind: "ok" }
}
