import type { AppError } from "../errors"
import { acceptedScenarioSchemaVersion, refusalOf, type ScenarioProblem } from "./document"
import { detailOf } from "./document-detail"
import { wordsOf } from "./problem-words"
import { flagError, type OverrideFlag } from "./set-parse"

/**
 * The loan codes (sim ADR-0016) a `--set` states sentence first, as the document form does (#336). The other
 * worded codes keep their code-first wording, which their own tests pin.
 */
const LOAN_CODES: ReadonlySet<string> = new Set([
	"LEVEL_TARGET_NOT_LIABILITY",
	"LEVEL_TARGET_NOT_NOMINAL",
	"LEVEL_FREQUENCY_MISMATCH",
	"LEVEL_PAYMENTS_OUT_OF_RANGE",
	"LEVEL_PAYMENT_OVERFLOW",
])

/**
 * What follows the code in a code-first refusal: a code the refusal table words gives its sentence; one
 * with no sentence still names what it needs (the category rule, say), as `refusalOf` does.
 */
function afterCode(problem: ScenarioProblem, said: ReturnType<typeof wordsOf>): string {
	if (said !== undefined) return `. ${said.message}`
	const needs = detailOf(problem, acceptedScenarioSchemaVersion)
	return needs === undefined ? "" : ` (${needs})`
}

/**
 * The refusal for the problem an Override causes. A loan code states its sentence first, then the schema hint
 * every document refusal carries (ADR-0052), as `scenario apply --file` does (#336); any other code keeps its
 * code-first wording. A decimal amount's hint names `--decimal` before the rest of that wording (#728); no loan code
 * is a decimal amount's code.
 */
export function overrideRefusal(
	flag: OverrideFlag,
	index: number,
	problem: ScenarioProblem,
	path: string,
	details: Record<string, unknown>,
	decimal?: string,
): AppError {
	const said = wordsOf(problem)
	if (said !== undefined && LOAN_CODES.has(problem.code)) {
		const schema = refusalOf(problem, "document").hint
		return flagError(flag, index, said.message, {
			hint: [said.hint, schema].filter((part) => part !== undefined).join(" "),
			details,
		})
	}
	const own = `The overrides leave ${path} invalid; change that value or the path.`
	return flagError(
		flag,
		index,
		`the document is invalid after the overrides: ${path}: ${problem.code}${afterCode(problem, said)}`,
		{
			hint: [decimal, said?.hint, own].filter((part) => part !== undefined).join(" "),
			details,
		},
	)
}
