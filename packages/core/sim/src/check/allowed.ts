import {
	ACCOUNT_KINDS,
	COMPARISONS,
	COMPOUNDING_PERIODS,
	CRITERION_KINDS,
	DAY_RULES,
	FI_METHODS,
	FLOW_KINDS,
	FREQUENCIES,
	FUNDINGS,
	MEASURE_OPS,
	MILESTONE_COMBINES,
	MILESTONE_TERMS,
	REFERENCE_BASES,
	REFERENCE_TERMS,
	REFERENCE_WINDOWS,
	RESOLUTIONS,
	ROUNDINGS,
	TALLY_BASES,
} from "../vocab"
import type { ErrorCode, Path } from "./codes"
import { DERIVE_RULES, LEVY_RULES } from "./measure"

/** The closed list a code names, for every code whose list does not depend on where it sits. */
const BY_CODE: Partial<Record<ErrorCode, readonly string[]>> = {
	INVALID_FREQUENCY: FREQUENCIES,
	INVALID_FUNDING: FUNDINGS,
	INVALID_COMPOUNDING: COMPOUNDING_PERIODS,
	INVALID_RESOLUTION: RESOLUTIONS,
	INVALID_DAY_RULE: DAY_RULES,
	INVALID_BASIS: TALLY_BASES,
	INVALID_ROUNDING: ROUNDINGS,
	INVALID_COMBINE: MILESTONE_COMBINES,
	INVALID_COMPARISON: COMPARISONS,
	INVALID_TERMS: MILESTONE_TERMS,
	INVALID_REFERENCE_BASIS: REFERENCE_BASES,
	INVALID_REFERENCE_WINDOW: REFERENCE_WINDOWS,
	INVALID_REFERENCE_TERMS: REFERENCE_TERMS,
	INVALID_FI_METHOD: FI_METHODS,
}

/** `INVALID_KIND` is raised for an Account, a Flow and a Milestone criterion: the path says which. */
function kindsAt(path: Path): readonly string[] | undefined {
	if (path.includes("criteria")) return CRITERION_KINDS
	if (path.includes("accounts")) return ACCOUNT_KINDS
	return path.includes("flows") ? FLOW_KINDS : undefined
}

/** A Measure's op: a Levy's graph takes `tally` and not `flow`, a Flow's `derive` graph the reverse. */
function opsAt(path: Path): readonly string[] {
	const denied: readonly string[] = path.includes("derive")
		? DERIVE_RULES.deny
		: path.includes("levies")
			? LEVY_RULES.deny
			: []
	return MEASURE_OPS.filter((op) => !denied.includes(op))
}

/**
 * The values a closed-list problem accepts, read from the same lists `check()` tests against, or
 * `undefined` for a code that is not a closed list. `path` is the problem's own, with or without its
 * leading `scenario`.
 */
export function allowedValues(code: ErrorCode, path: Path): readonly string[] | undefined {
	if (code === "INVALID_KIND") return kindsAt(path)
	return code === "INVALID_OP" ? opsAt(path) : BY_CODE[code]
}
