import type { AccountId, DateString } from "../types"
import type { MilestoneResult } from "../types/milestone"
import type { ProjectionProblem } from "../types/projection"
import type { EngineLevy } from "./levy-types"
import type { DayTotals, EngineRunsOut } from "./occurrence"
import type { RuleBook } from "./rule-book"
import type { EngineSnapshot } from "./snapshot"

export interface EngineRun {
	readonly snapshots: readonly EngineSnapshot[]
	readonly totals: readonly DayTotals[]
	readonly runsOut?: EngineRunsOut
	readonly levies?: readonly EngineLevy[]
	readonly milestones?: readonly MilestoneResult[]
	/** Present only when the run tracks liabilities: the first date each one reached zero. */
	readonly paidOff?: ReadonlyMap<AccountId, DateString>
	/** The rule Flows' Rule years; present only when the Scenario declares a rule Flow. */
	readonly rules?: RuleBook
}

export type EngineResult =
	| { readonly ok: true; readonly run: EngineRun }
	| { readonly ok: false; readonly problem: ProjectionProblem }
