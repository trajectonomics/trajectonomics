import type { ErrorCode } from "@trajectonomics/core/sim"

/**
 * A code that never reaches `refusal()` as a projection refusal, and who answers it instead:
 * `document` is a Scenario problem `check()` finds in the document alone, so `scenario apply`, the
 * Store and `--set` refuse it as `invalid_input` before an engine runs (ADR-0024); `input` is a
 * problem in what the CLI builds from a flag, which `timelineFailure` and `chanceRefusal` refuse as
 * `invalid_input` at that flag (ADR-0013, ADR-0030).
 */
export type Elsewhere = { elsewhere: "document" | "input" }

const document: Elsewhere = { elsewhere: "document" }
const input: Elsewhere = { elsewhere: "input" }

/** The codes the CLI answers before, or beside, the projection refusal, each with who does. */
export const ELSEWHERE: Readonly<Partial<Record<ErrorCode, Elsewhere>>> = {
	// The Scenario's own document: refused before an engine runs.
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
	RATE_OUT_OF_RANGE: document,
	INVALID_OP: document,
	INVALID_BASIS: document,
	INVALID_ROUNDING: document,
	INVALID_DENOMINATOR: document,
	INVALID_MONTH_DAY: document,
	UNKNOWN_MEASURE: document,
	UNKNOWN_LEVY: document,
	UNKNOWN_FLOW: document,
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
	// What the CLI builds from a flag: the Timeline, the path count, the seed and the Return model.
	HORIZON_BEFORE_START: input,
	INVALID_RESOLUTION: input,
	TOO_MANY_ENTRIES: input,
	INVALID_FI_METHOD: input,
	INVALID_PATH_COUNT: input,
	INVALID_SEED: input,
	REFERENCE_MULTIPLIER_OUT_OF_RANGE: input,
	INVALID_REFERENCE_BASIS: input,
	INVALID_REFERENCE_WINDOW: input,
	INVALID_REFERENCE_TERMS: input,
	INVALID_WEIGHT: input,
	RETURN_WEIGHT_TOTAL: input,
}
