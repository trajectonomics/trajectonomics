import type { MilestoneResult } from "../types/milestone"
import type { ProjectionProblem } from "../types/projection"
import type { EngineLevy } from "./levy-types"
import type { DayTotals, EngineRunsOut } from "./occurrence"
import type { EngineSnapshot } from "./snapshot"

export interface EngineRun {
	readonly snapshots: readonly EngineSnapshot[]
	readonly totals: readonly DayTotals[]
	readonly runsOut?: EngineRunsOut
	readonly levies?: readonly EngineLevy[]
	readonly milestones?: readonly MilestoneResult[]
}

export type EngineResult =
	| { readonly ok: true; readonly run: EngineRun }
	| { readonly ok: false; readonly problem: ProjectionProblem }
