import { type AppError, fail } from "../errors"
import { refusalOf, type ScenarioProblem, scenarioProblems } from "./document"
import { ownProblems } from "./own-problems"
import { wordsOf } from "./problem-words"

/** One `details` entry: the sentence a worded code carries is the one `scenario apply` puts in each detail too. */
function detailsOf(problems: readonly ScenarioProblem[], base: string) {
	return problems.map((problem) => {
		const refusal = refusalOf(problem, base)
		return {
			path: refusal.path,
			message: wordsOf(problem)?.message ?? refusal.message,
			code: refusal.code,
		}
	})
}

/** The refusal for a list of problems: the first one's sentence and path, every one in `details`. */
function documentError(problems: readonly ScenarioProblem[], base: string): AppError | null {
	const first = problems[0]
	if (first === undefined) return null
	const refusal = refusalOf(first, base)
	const said = wordsOf(first)
	return fail("invalid_input", {
		path: refusal.path,
		message: said?.message ?? refusal.message,
		// A worded refusal keeps the schema hint every document refusal carries (ADR-0052).
		hint: [said?.hint, refusal.hint].filter((part) => part !== undefined).join(" "),
		details: detailsOf(problems, base),
	})
}

/**
 * The `invalid_input` for a document `sim-core` refuses, or null when it accepts the document. A code
 * the refusal table words (a loan's rules, ADR-0016) states its own sentence and hint, the same ones
 * `projection run` prints for a stored row, followed by the schema hint every document refusal carries
 * (ADR-0052); any other code keeps the code and its allowed values.
 */
export function scenarioDocumentError(value: unknown, base = "document"): AppError | null {
	return documentError(scenarioProblems(value), base)
}

/**
 * The `invalid_input` for the one rule of a stored plan the engine does not state (cli ADR-0067), or
 * null. A plan saved before the rule existed is not re-checked by `sim-core` on a read, so a read
 * states it in the words `scenario apply` does.
 */
export function ownDocumentError(value: unknown, base = "document"): AppError | null {
	return documentError(ownProblems(value), base)
}
