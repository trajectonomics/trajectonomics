import { sentenceFor } from "../projection/refusal-table"
import type { ScenarioProblem } from "./document"
import { isOwnCode, ownSentence } from "./own-problems"

/**
 * The sentence and way out for a problem: the CLI's own rule's (an employer
 * share with a member-only label, cli ADR-0067), or the refusal table's for an engine code it words. The same words in the document form, the Store and `--set`.
 */
export function wordsOf(problem: ScenarioProblem): { message: string; hint?: string } | undefined {
	if (isOwnCode(problem.code)) return ownSentence(problem.code)
	return sentenceFor({
		code: problem.code,
		path: ["scenario", ...problem.segments.map(String)],
	})
}
