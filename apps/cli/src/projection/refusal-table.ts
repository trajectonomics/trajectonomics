import type { ErrorCode, ProjectionProblem } from "@trajectonomics/core/sim"
import { ELSEWHERE, type Elsewhere } from "./refusal-elsewhere"
import { SAID, type Said } from "./refusal-said"

export type RefusalEntry = Said | Elsewhere

/** Every engine problem code, once: its sentence, or who answers it instead. */
export const REFUSALS: Readonly<Partial<Record<ErrorCode, RefusalEntry>>> = {
	...SAID,
	...ELSEWHERE,
}

/** The sentence and hint for a problem, or `undefined` when the CLI has none for its code. */
export function sentenceFor(
	problem: ProjectionProblem,
): { message: string; hint?: string } | undefined {
	const entry = REFUSALS[problem.code]
	if (entry === undefined || !("message" in entry)) return undefined
	const message = typeof entry.message === "string" ? entry.message : entry.message(problem)
	return entry.hint === undefined ? { message } : { message, hint: entry.hint }
}
