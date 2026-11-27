import { scenarioProblems } from "../document"
import { type Step, withoutAt } from "./paths"

/**
 * Whether the document refuses its path when the value there is left out (cli ADR-0048). `sim-core`
 * owns which keys a document must state, so the answer is its own `check()`, not a second list of
 * required dates here (ADR-0024): a Flow's `start` and a date criterion's `on` are required, while
 * a Flow's `end` and an Account's `lockedUntil` are optional.
 */
export function refusesWithout(document: unknown, at: readonly Step[]): boolean {
	const target = at.map(String)
	return scenarioProblems(withoutAt(document, at)).some(
		(problem) =>
			problem.code === "MISSING_KEY" &&
			problem.segments.length === target.length &&
			problem.segments.every((segment, index) => String(segment) === target[index]),
	)
}
