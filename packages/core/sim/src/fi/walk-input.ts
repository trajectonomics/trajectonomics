import type { RecordedValues } from "../engine/account-values"
import type { DateString, Scenario } from "../types"
import type { PrefixPoint } from "./prefix"
import type { RequirementTable } from "./required"
import type { WindowPlan } from "./windows"

export interface WalkInput {
	readonly scenario: Scenario
	readonly month: DateString
	readonly point: PrefixPoint
	readonly windows: WindowPlan
}

/** The accessible net worth after a date's flows, kept to be checked once the windows are known. */
export interface TracePoint {
	readonly date: DateString
	readonly accessible: bigint
}

/** What one day of a candidate walk reads. `table` is `undefined` when each candidate builds its own. */
export interface DayInput {
	readonly scenario: Scenario
	readonly point: PrefixPoint
	readonly months: number
	readonly table: RequirementTable | undefined
	readonly trace: TracePoint[]
	/** The Account values the walk records before each date's Flows, when a Derived amount reads one. */
	readonly values?: RecordedValues
}
