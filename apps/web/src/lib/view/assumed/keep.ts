import type { EditInput } from "../../edit/edit"
import type { AssumedKeep } from "./types"

/**
 * The Edit a Keep sends: a Set of the value as the Read printed it, which states it without changing it
 * ([web ADR 0032](../../../../docs/adr/0032-home-and-the-plan-page-show-what-a-plan-assumes.md)).
 */
export function keepEdit(name: string, contentHash: string, keep: AssumedKeep): EditInput {
	return {
		kind: "apply-overrides",
		name,
		contentHash,
		sets: [{ path: keep.path, value: keep.value }],
		removals: [],
		additions: [],
	}
}
