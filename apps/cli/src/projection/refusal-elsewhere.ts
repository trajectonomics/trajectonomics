import type { ErrorCode } from "@trajectonomics/core/sim"

/**
 * A code that is not a projection refusal in the usual run, and who answers it instead:
 * `document` is a Scenario problem `check()` finds in the document alone, so `scenario apply`, the
 * Store and `--set` refuse it as `invalid_input` before an engine runs (ADR-0024). The exception is
 * a Scenario stored before a newer engine rule and run without `--set`, which nothing re-checks, so
 * `refusal()` words it from the document's own sentence. `input` is a problem in what the CLI builds
 * from a flag (the Timeline, the path count, the seed, the Return model, the allowance step and
 * labels), which `timelineFailure`, `chanceRefusal` and `allowancesRefusal` refuse as `invalid_input` at that flag (ADR-0013, ADR-0030). `never` is a
 * problem in an option the CLI does not pass, or fixes to a valid value, so no command raises it.
 */
export type Elsewhere = { elsewhere: "document" | "input" | "never" }

const document: Elsewhere = { elsewhere: "document" }
const input: Elsewhere = { elsewhere: "input" }
const never: Elsewhere = { elsewhere: "never" }

/** The codes the CLI answers before, or beside, the projection refusal, each with who does. */
export const ELSEWHERE: Readonly<Partial<Record<ErrorCode, Elsewhere>>> = {
	// The Scenario's own document: refused before an engine runs, but for a stale stored row.
	UNSUPPORTED_SCHEMA_VERSION: document,
	NOT_AN_OBJECT: document,
	NOT_AN_ARRAY: document,
	MISSING_KEY: document,
	UNKNOWN_KEY: document,
	WRONG_TYPE: document,
	EMPTY_STRING: document,
	NOT_SAFE_INTEGER: document,
	NEGATIVE_AMOUNT: document,
	INVALID_DATE: document,
	INVALID_KIND: document,
	INVALID_COMPOUNDING: document,
	INVALID_FREQUENCY: document,
	INVALID_GROWTH: document,
	END_BEFORE_START: document,
	ONCE_FLOW_END_MISMATCH: document,
	DUPLICATE_ID: document,
	UNKNOWN_ACCOUNT: document,
	LIABILITY_MISUSE: document,
	SURPLUS_UNROUTED: document,
	CONTRIBUTION_UNROUTED: document,
	ILLIQUID_ROUTED: document,
	RATE_OUT_OF_RANGE: document,
	INVALID_OP: document,
	INVALID_BASIS: document,
	INVALID_ROUNDING: document,
	INVALID_DENOMINATOR: document,
	INVALID_MONTH_DAY: document,
	UNKNOWN_MEASURE: document,
	UNKNOWN_LEVY: document,
	UNKNOWN_FLOW: document,
	ACCOUNT_MEASURE_IN_LEVY: document,
	NEXT_12_MONTHS_READS_ACCOUNT: document,
	FLOW_CYCLE: document,
	STEPS_NOT_ASCENDING: document,
	CAP_NOT_CONST: document,
	MEASURE_CYCLE: document,
	FIELD_NOT_ALLOWED: document,
	LEVY_REQUIRED: document,
	CONFLICTING_LABELS: document,
	INVALID_DAY_RULE: document,
	DUPLICATE_HOLIDAY: document,
	HOLIDAYS_UNUSABLE: document,
	UNKNOWN_MILESTONE: document,
	MILESTONE_CYCLE: document,
	MILESTONE_LOOKAHEAD: document,
	INVALID_METRIC: document,
	MIXED_METRIC_ACCOUNTS: document,
	INVALID_COMPARISON: document,
	INVALID_TERMS: document,
	INVALID_MULTIPLE: document,
	INVALID_COMBINE: document,
	INVALID_CATEGORY: document,
	// What the CLI builds from a flag: the Timeline, the path count, the seed and the Return model.
	HORIZON_BEFORE_START: input,
	INVALID_RESOLUTION: never,
	TOO_MANY_ENTRIES: input,
	INVALID_FI_METHOD: never,
	INVALID_PATH_COUNT: input,
	INVALID_SEED: input,
	REFERENCE_MULTIPLIER_OUT_OF_RANGE: never,
	INVALID_REFERENCE_BASIS: never,
	INVALID_REFERENCE_WINDOW: never,
	INVALID_REFERENCE_TERMS: never,
	INVALID_WEIGHT: input,
	RETURN_WEIGHT_TOTAL: input,
	// Refused by `contributionSavings` only. `projection allowances` answers the first three at its
	// flags (`allowancesRefusal`, cli ADR-0061); PERIOD_DUE_MISMATCH cannot happen on a correct call,
	// since the period comes from the Projection of the same Levy, so it is an internal error.
	UNKNOWN_FUNDED_LABEL: input,
	TOO_MANY_STEPS: input,
	INVALID_OPTION: input,
	PERIOD_DUE_MISMATCH: never,
	// A Spending rule the CLI does not publish yet; the CLI change for #360 (#362) makes these user-facing.
	RULE_NOT_EXPENSE: never,
	RULE_PORTFOLIO_LIABILITY: never,
	RULE_PORTFOLIO_ILLIQUID: never,
	RULE_FREQUENCY: never,
	RULE_FLOOR_ABOVE_CEILING: never,
}
