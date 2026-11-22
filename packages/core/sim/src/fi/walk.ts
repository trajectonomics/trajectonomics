import { flowsAt } from "../engine/events"
import type { DateString, Scenario } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { BufferBreach } from "./buffer"
import { cloneLevySet, cloneStates } from "./clone"
import type { PrefixPoint } from "./prefix"
import type { RequirementTable } from "./required"
import { gridDates, gridEvents, type ScanGrid } from "./scan-grid"
import { stopsFlow } from "./scan-stop"
import { processDay } from "./walk-day"

export interface Shortfall {
	readonly date: DateString
	readonly unmet: bigint
	readonly undrawable: bigint
}

export type WalkOutcome =
	| { readonly kind: "survived" }
	| { readonly kind: "buffer"; readonly breach: BufferBreach }
	| { readonly kind: "shortfall"; readonly shortfall: Shortfall }
	| { readonly kind: "problem"; readonly problem: ProjectionProblem }

export interface WalkInput {
	readonly scenario: Scenario
	readonly month: DateString
	readonly point: PrefixPoint
	readonly requirement: RequirementTable
}

/** Continues a candidate from its unchanged prefix, checking survival and the optional buffer. */
export function walkCandidate(input: WalkInput, grid: ScanGrid): WalkOutcome {
	const events = gridEvents(grid, input.month)
	const point = {
		states: cloneStates(input.point.states),
		levies: cloneLevySet(input.point.levies),
		...(input.point.gate && {
			gate: input.point.gate.clone(events, stopsFlow(grid.retirement)),
		}),
	}
	const working: WalkInput = { ...input, point }
	const dates = gridDates(grid, input.month)
	let index = 0
	let firstBreach: BufferBreach | undefined
	for (const date of dates) {
		const [next, dayEvents] = flowsAt(events, index, date)
		index = next
		const day = processDay(working, date, dayEvents)
		if (day.kind !== "ok") return day
		if (day.breach !== undefined && firstBreach === undefined) firstBreach = day.breach
	}
	return firstBreach === undefined ? { kind: "survived" } : { kind: "buffer", breach: firstBreach }
}
