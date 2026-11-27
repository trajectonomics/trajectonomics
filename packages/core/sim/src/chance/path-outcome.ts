import type { MinorUnits } from "../types"
import type { MilestoneResult } from "../types/milestone"
import type { ProjectionProblem, RunsOut } from "../types/projection"

/** One Market path's net worth at every grid period, and the period it ran out in if it did. */
export interface PathOutcome {
	readonly netWorth: readonly MinorUnits[]
	readonly runsOutIndex?: number
	/** The date and unmet amount the path ran out with; present only when it did. */
	readonly runsOut?: RunsOut
	/** The least net worth over the grid and the first period index that closed at it. */
	readonly lowest: { readonly value: MinorUnits; readonly at: number }
	/** What the rule Flows paid in each grid period; present only when the Scenario has a rule Flow. */
	readonly spent?: readonly MinorUnits[]
	/** The path's lowest year of that spending, absent when it has no whole year and did not run out. */
	readonly lowestYear?: MinorUnits
	/** Each Milestone's result on this path; present only with the `milestoneDates` option (ADR 0011). */
	readonly milestones?: readonly MilestoneResult[]
}

export type PathResult =
	| { readonly ok: true; readonly outcome: PathOutcome }
	| { readonly ok: false; readonly problem: ProjectionProblem }
