import { sentenceFor } from "../projection/refusal-table"
import type { ScenarioProblem } from "./document"
import { isOwnProblem, ownSentence } from "./own-problems"

/**
 * The sentence and way out for a problem: the CLI's own rule's (an employer
 * share with a member-only label, cli ADR-0067), or the refusal table's for an engine code it words. The same words in the document form, the Store and `--set`.
 */
export function wordsOf(problem: ScenarioProblem): { message: string; hint?: string } | undefined {
	if (isOwnProblem(problem)) return ownSentence(problem.label)
	return sentenceFor({
		code: problem.code,
		path: ["scenario", ...problem.segments.map(String)],
	})
}
