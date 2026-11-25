import { allowedValues, DISPLAY_LABEL_RULE, EXPENSE_CATEGORY_RULE } from "@trajectonomics/core/sim"
import type { ScenarioProblem } from "./document"
import { isOwnCode } from "./own-problems"

/** The rate fields of a document: a rate is written in basis points, never as a fraction. */
const RATE_SEGMENTS: ReadonlySet<string | number> = new Set(["rate", "bps", "inflation", "share"])

const GROWTH_FORMS = '"inflation", {"bps": <integer>}; {"bps": 0} is a fixed amount'

/**
 * What a reader needs to fix a refusal without trial and error, in the words ADR-0013 gives a
 * closed flag: the accepted version, the allowed values of a closed list (read from `sim-core`,
 * which owns them), the forms a growth takes, the unit of a rate, or the rule an expense category
 * broke (also `sim-core`'s own words).
 */
export function detailOf(
	problem: ScenarioProblem,
	acceptedVersion: () => number | undefined,
): string | undefined {
	if (problem.code === "UNSUPPORTED_SCHEMA_VERSION") {
		const accepted = acceptedVersion()
		return accepted === undefined ? undefined : `the accepted version is ${accepted}`
	}
	if (problem.code === "INVALID_CATEGORY") return EXPENSE_CATEGORY_RULE
	if (problem.code === "INVALID_LABEL") return DISPLAY_LABEL_RULE
	if (problem.code === "INVALID_GROWTH") return `one of: ${GROWTH_FORMS}`
	if (problem.code === "NOT_SAFE_INTEGER" && problem.segments.some((s) => RATE_SEGMENTS.has(s))) {
		return "basis points, a whole number: 2% is 200"
	}
	if (isOwnCode(problem.code)) return undefined
	const allowed = allowedValues(problem.code, problem.segments)
	return allowed === undefined ? undefined : `one of: ${allowed.join(", ")}`
}
