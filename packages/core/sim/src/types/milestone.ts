import type { COMPARISONS, METRIC_NAMES, MILESTONE_COMBINES, MILESTONE_TERMS } from "../vocab"
import type { AccountId, DateString, MinorUnits } from "./common"
import type { ReferenceWindow } from "./reference"

export type Comparison = (typeof COMPARISONS)[number]
export type MilestoneTerms = (typeof MILESTONE_TERMS)[number]
export type MetricName = (typeof METRIC_NAMES)[number]
export type MilestoneCombine = (typeof MILESTONE_COMBINES)[number]

/** A money figure the plan reports on a date: a named balance, a sum of Accounts or an expense window. */
export type Metric =
	| MetricName
	| { readonly accounts: readonly AccountId[] }
	| { readonly expenses: ReferenceWindow }

interface CriterionBase {
	readonly id: string
}

/** Holds from `on` onward. */
export interface DateCriterion extends CriterionBase {
	readonly kind: "date"
	readonly on: DateString
}

/** Holds `months` calendar months after the named milestone fired; negative means before. */
export interface MilestoneCriterion extends CriterionBase {
	readonly kind: "milestone"
	readonly milestone: string
	readonly months: number
}

/** Holds while the Metric compares with `amount` by `op`. */
export interface MetricCriterion extends CriterionBase {
	readonly kind: "metric"
	readonly metric: Metric
	readonly op: Comparison
	readonly amount: MinorUnits
	readonly terms: MilestoneTerms
}

/** Holds while `metric × den` compares with `base × num` by `op`, in exact integers. */
export interface MultipleCriterion extends CriterionBase {
	readonly kind: "multiple"
	readonly metric: Metric
	readonly op: Comparison
	readonly base: Metric
	readonly num: number
	readonly den: number
	readonly terms: MilestoneTerms
}

export type Criterion = DateCriterion | MilestoneCriterion | MetricCriterion | MultipleCriterion

/** A named point in the plan that Flows may gate on. Fires on the first date its criteria hold. */
export interface Milestone {
	readonly id: string
	readonly combine: MilestoneCombine
	readonly criteria: readonly Criterion[]
}

/** The fire date of one Milestone, or `reached: false` when it did not fire by the run's end. */
export type MilestoneResult =
	| { readonly id: string; readonly reached: true; readonly date: DateString }
	| { readonly id: string; readonly reached: false }
