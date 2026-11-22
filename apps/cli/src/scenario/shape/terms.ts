/*
 * The units and the closed value sets the published Scenario document states. They are the words a
 * person needs to write a document by hand, kept apart from the shapes that use them so a unit is
 * stated once (ADR-0009, #151).
 */

/** The unit of every money field: integer minor units, never the decimal string a result prints. */
export const MINOR_UNITS =
	"Integer minor units of `currency` (satang for THB): 35000 is 350.00 THB, and a Flow states it per occurrence, not per year."

/**
 * The unit of every money field in the decimal form (ADR-0047): a JSON string of the Currency's
 * major unit. It replaces MINOR_UNITS' head in that form's published schema, so the two stay one
 * statement of the same field.
 */
export const DECIMAL_UNITS =
	'A decimal string of `currency`\'s major unit, never a JSON number: "350.00" is 35000 satang, with at most as many places as the Currency has (two for THB).'

/** The unit of every rate field. */
export const BASIS_POINTS =
	"Integer basis points (1 bps = 0.01%), so 3% is 300 and 0.01 is not a rate."

export const DATE = "YYYY-MM-DD, Gregorian, never the Buddhist calendar."

export const COMPOUNDING = ["monthly", "quarterly", "semiannual", "annual"] as const
export const FREQUENCIES = [
	"once",
	"daily",
	"weekly",
	"biweekly",
	"monthly",
	"quarterly",
	"annual",
] as const
export const DAY_RULES = ["exact", "next"] as const
/** The kinds of criterion a Milestone may hold; each kind takes its own keys (sim's ADR 0012). */
export const CRITERION_KINDS = ["date", "milestone", "metric", "multiple"] as const
/** How a Milestone's criteria combine: every one must hold, or any one of them. */
export const MILESTONE_COMBINES = ["all", "any"] as const
/** A metric or multiple criterion's comparison: at least the figure, or at most it. */
export const COMPARISONS = ["atLeast", "atMost"] as const
/** The named balances a Metric may read; `{ accounts }` and `{ expenses }` are the other forms. */
export const METRIC_NAMES = [
	"netWorth",
	"accessibleNetWorth",
	"allAssets",
	"unlockedAssets",
	"liabilities",
] as const
/** The twelve-month window an expense Metric reads: the twelve months after, or before, the date. */
export const REFERENCE_WINDOWS = ["next12Months", "trailing12Months"] as const
/** Nominal money, or real money deflated to the Timeline's start, for a metric criterion. */
export const MILESTONE_TERMS = ["nominal", "real"] as const
/** The operations a Flow's own Measure graph may hold; `tally` belongs to a Levy (ADR-0032). */
export const DERIVE_MEASURE_OPS = [
	"const",
	"add",
	"sub",
	"min",
	"max",
	"scale",
	"mul",
	"pick",
	"flow",
] as const
