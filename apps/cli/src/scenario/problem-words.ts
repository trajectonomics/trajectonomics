import { allowedValues } from "@trajectonomics/core/sim"
import { sentenceFor } from "../projection/refusal-table"
import type { ScenarioProblem } from "./document"
import { ROUTING_NOT_SHIPPED } from "./routing-unshipped"
import { withoutUnshippedKinds } from "./transfer-unshipped"

/**
 * The sentence and way out for a problem: the routing refusal's own, or the refusal table's for an
 * engine code it words. The same words in the document form, the Store and `--set`.
 */
export function wordsOf(problem: ScenarioProblem): { message: string; hint?: string } | undefined {
	if (problem.code === ROUTING_NOT_SHIPPED) return problem.said
	return sentenceFor({
		code: problem.code,
		path: ["scenario", ...problem.segments.map(String)],
	})
}

/** The values the engine lists for a code, less the Flow kinds this release does not take (transfer-unshipped.ts). */
export function shippedValues(
	...query: Parameters<typeof allowedValues>
): readonly string[] | undefined {
	return withoutUnshippedKinds(allowedValues(...query))
}
