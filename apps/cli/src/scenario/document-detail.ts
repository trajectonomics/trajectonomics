import type { ScenarioProblem } from "./document"
import { isOwnCode } from "./own-problems"
import { shippedValues } from "./problem-words"
import { ROUTING_NOT_SHIPPED } from "./routing-unshipped"

/** The rate fields of a document: a rate is written in basis points, never as a fraction. */
const RATE_SEGMENTS: ReadonlySet<string | number> = new Set(["rate", "bps", "inflation"])

const GROWTH_FORMS = '"inflation", {"bps": <integer>}; {"bps": 0} is a fixed amount'

/**
 * What a reader needs to fix a refusal without trial and error, in the words ADR-0013 gives a
 * closed flag: the accepted version, the allowed values of a closed list (read from `sim-core`,
 * which owns them), the forms a growth takes, or the unit of a rate.
 */
export function detailOf(
	problem: ScenarioProblem,
	acceptedVersion: () => number | undefined,
): string | undefined {
	if (problem.code === ROUTING_NOT_SHIPPED) return undefined
	if (problem.code === "UNSUPPORTED_SCHEMA_VERSION") {
		const accepted = acceptedVersion()
		return accepted === undefined ? undefined : `the accepted version is ${accepted}`
	}
	if (problem.code === "INVALID_GROWTH") return `one of: ${GROWTH_FORMS}`
	if (problem.code === "NOT_SAFE_INTEGER" && problem.segments.some((s) => RATE_SEGMENTS.has(s))) {
		return "basis points, a whole number: 2% is 200"
	}
	if (isOwnCode(problem.code)) return undefined
	const allowed = shippedValues(problem.code, problem.segments)
	return allowed === undefined ? undefined : `one of: ${allowed.join(", ")}`
}
