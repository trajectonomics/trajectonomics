import type { AccountValues, ErrorBody, Snapshot } from "../contract"
import type { EditAnswer } from "./answer"
import { WRITTEN_REREAD_FAILED } from "./failure"

/**
 * What one Edit answer comes to: a write that landed (with the Snapshot read after it, or null when that read
 * failed), a refusal, or an answer the page cannot read.
 */
export type EditOutcome =
	| { readonly kind: "unreadable" }
	| { readonly kind: "refused"; readonly error: ErrorBody }
	| {
			readonly kind: "written"
			readonly snapshot: Snapshot | null
			readonly result: AccountValues | null
			readonly droppedAnchors: readonly string[]
			readonly droppedOwners: readonly string[]
			readonly replaced: boolean
	  }

/** Reads an Edit answer as an outcome: `written_reread_failed` is a write that landed, never a refusal. */
export function editOutcome(answer: EditAnswer | null): EditOutcome {
	if (answer === null) return { kind: "unreadable" }
	if (!answer.ok && answer.error.code !== WRITTEN_REREAD_FAILED)
		return { kind: "refused", error: answer.error }
	return {
		kind: "written",
		snapshot: answer.ok ? answer.snapshot : null,
		result: answer.result ?? null,
		droppedAnchors: answer.droppedAnchors ?? [],
		droppedOwners: answer.droppedOwners ?? [],
		replaced: answer.replaced === true,
	}
}
