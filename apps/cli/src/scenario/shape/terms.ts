import { allowedValues, type ErrorCode, type MetricName } from "@trajectonomics/core/sim"

/*
 * The units and the closed value sets the published Scenario document states. They are the words a
 * person needs to write a document by hand, kept apart from the shapes that use them so a unit is
 * stated once (ADR-0009, #151).
 */

/** The head every money field's unit starts with: integer minor units, never the decimal string a result prints. */
const MINOR_UNITS_HEAD = "Integer minor units of `currency` (satang for THB): 35000 is 350.00 THB"

/** The unit of a Flow's money field: its amount, per occurrence. */
export const MINOR_UNITS: string = `${MINOR_UNITS_HEAD}, and a Flow states it per occurrence, not per year.`

/** The unit of a level loan's principal: stated once for the whole loan, so the per-occurrence tail does not apply. */
export const PRINCIPAL_UNITS: string = `${MINOR_UNITS_HEAD}, and the principal is stated once for the whole loan, not per occurrence or per year.`

/**
 * The unit of every money field in the decimal form (ADR-0047): a JSON string of the Currency's
 * major unit. It replaces MINOR_UNITS' head in that form's published schema, so the two stay one
 * statement of the same field.
 */
export const DECIMAL_UNITS =
	'A decimal string of `currency`\'s major unit, never a JSON number: "350.00" is 35000 satang, with at most as many places as the Currency has (two for THB).'

/**
 * The engine's cap on an asset Contribution, stated once (sim's `engine/occurrence.ts`): the day's
 * income minus the tax prepaid, expenses, debt payments and tax settled that day. A lump sum from
 * savings is therefore mostly not funded.
 */
export const CONTRIBUTION_CAP =
	"an asset Contribution is capped by that day's income minus the tax prepaid, expenses, debt payments and tax settled that day, so a lump sum from savings is not funded"

/** The unit of every rate field. */
export const BASIS_POINTS =
	"Integer basis points (1 bps = 0.01%), so 3% is 300 and 0.01 is not a rate."

export const DATE = "YYYY-MM-DD, Gregorian, never the Buddhist calendar."

/**
 * A closed list the Scenario document states, read from the vocabulary `check()` tests against
 * through `allowedValues`, so the schema and the refusals name the same values and the CLI copies
 * none of them (AGENTS rule 3, ADR-0052). `path` says which list a code shared by several is.
 */
function closed(code: ErrorCode, path: readonly string[] = []): readonly string[] {
	const values = allowedValues(code, path)
	if (values === undefined) throw new Error(`The engine lists no values for ${code}.`)
	return values
}

export const ACCOUNT_KINDS: readonly string[] = closed("INVALID_KIND", ["accounts"])
export const FLOW_KINDS: readonly string[] = closed("INVALID_KIND", ["flows"])
/** How a Contribution into an asset is paid: a target spends Available cashflow, an obligation is paid in full (sim's ADR 0021). */
export const FUNDINGS: readonly string[] = closed("INVALID_FUNDING")
export const COMPOUNDING: readonly string[] = closed("INVALID_COMPOUNDING")
export const FREQUENCIES: readonly string[] = closed("INVALID_FREQUENCY")
export const DAY_RULES: readonly string[] = closed("INVALID_DAY_RULE")
/** How a `scale` or `mul` Measure rounds its quotient: down, to nearest with halves up, or up. */
export const ROUNDINGS: readonly string[] = closed("INVALID_ROUNDING")
/** The kinds of criterion a Milestone may hold; each kind takes its own keys (sim's ADR 0012). */
export const CRITERION_KINDS: readonly string[] = closed("INVALID_KIND", ["criteria"])
/** How a Milestone's criteria combine: every one must hold, or any one of them. */
export const MILESTONE_COMBINES: readonly string[] = closed("INVALID_COMBINE")
/** A metric or multiple criterion's comparison: at least the figure, or at most it. */
export const COMPARISONS: readonly string[] = closed("INVALID_COMPARISON")
/** The twelve-month window an expense Metric reads: the twelve months after, or before, the date. */
export const REFERENCE_WINDOWS: readonly string[] = closed("INVALID_REFERENCE_WINDOW")
/** Nominal money, or real money deflated to the Timeline's start, for a metric criterion. */
export const MILESTONE_TERMS: readonly string[] = closed("INVALID_TERMS")
/** The operations a Flow's own Measure graph may hold; `tally` belongs to a Levy (ADR-0032). */
export const DERIVE_MEASURE_OPS: readonly string[] = closed("INVALID_OP", ["derive"])
/**
 * The named balances a Metric may read; `{ accounts }` and `{ expenses }` are the other forms. The
 * engine lists no values for `INVALID_METRIC` (its other form is an object), so this one stays
 * written here and `milestone-enums.test.ts` probes it against the pinned core.
 */
export const METRIC_NAMES = [
	"netWorth",
	"accessibleNetWorth",
	"allAssets",
	"unlockedAssets",
	"liabilities",
] as const

/** Fails typecheck when the engine adds a Metric name `METRIC_NAMES` lacks. */
export const METRIC_NAMES_COMPLETE: [Exclude<MetricName, (typeof METRIC_NAMES)[number]>] extends [
	never,
]
	? true
	: false = true
