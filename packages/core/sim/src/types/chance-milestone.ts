import type { DateString } from "./common"

/** One nearest-rank fire-date Percentile across the Market paths a Milestone fired on. */
export interface ChanceMilestoneDate {
	readonly level: number
	/** The fire date's calendar month, as its first day (ADR 0011). */
	readonly date: DateString
}

/** How many Market paths fired a Milestone in one calendar year. */
export interface ChanceMilestoneYear {
	readonly year: number
	readonly paths: number
}

/** When one Milestone fired across the Market paths that reached it (ADR 0011). */
export interface ChanceMilestone {
	readonly id: string
	/** Market paths on which it fired before their run ended. */
	readonly reached: number
	/** The five Percentiles over the paths that fired; empty when none did. */
	readonly dates: readonly ChanceMilestoneDate[]
	/** One entry per calendar year with a fire, ascending. */
	readonly byYear: readonly ChanceMilestoneYear[]
}
