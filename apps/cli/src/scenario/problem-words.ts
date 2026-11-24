import { sentenceFor } from "../projection/refusal-table"
import type { ScenarioProblem } from "./document"
import { isOwnCode, ownSentence } from "./own-problems"
import { ROUTING_NOT_SHIPPED } from "./routing-unshipped"

/**
 * The sentence and way out for a problem: the routing refusal's own, the CLI's own rule's (an employer
 * share with a member-only label, cli ADR-0067), or the refusal table's for an engine code it words. The same words in the document form, the Store and `--set`.
 */
export function wordsOf(problem: ScenarioProblem): { message: string; hint?: string } | undefined {
	if (problem.code === ROUTING_NOT_SHIPPED) return problem.said
	if (isOwnCode(problem.code)) return ownSentence(problem.code)
	return sentenceFor({
		code: problem.code,
		path: ["scenario", ...problem.segments.map(String)],
	})
}
