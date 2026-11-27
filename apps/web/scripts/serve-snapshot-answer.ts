// The answers of a write that ran: the Snapshot read after it, with what the write stated beside it ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
import { writtenRereadFailed } from "../src/lib/edit/failure"
import { failure } from "./serve-edit-answer"
import { json } from "./serve-respond"
import type { SnapshotRun } from "./snapshot-run"

/**
 * What a write stated beside the Snapshot: the batch traj wrote (`record-values`), the household anchors and
 * Owners it dropped, and whether it replaced a plan of its name made while it ran.
 */
export type Stated = {
	readonly result?: unknown
	readonly droppedAnchors?: readonly string[]
	readonly droppedOwners?: readonly string[]
	readonly replaced?: boolean
}

/** The answer's fields for what the write stated; an empty list and a false flag are left out. */
function statedFields(stated: Stated): Record<string, unknown> {
	return {
		...(stated.result === undefined ? {} : { result: stated.result }),
		...(stated.droppedAnchors?.length ? { droppedAnchors: stated.droppedAnchors } : {}),
		...(stated.droppedOwners?.length ? { droppedOwners: stated.droppedOwners } : {}),
		...(stated.replaced === true ? { replaced: true } : {}),
	}
}

/** Answers a Snapshot run: the Snapshot with what the write stated, or the read's own error as data (a read that wrote nothing). */
export function answerOf(run: SnapshotRun, stated: Stated = {}): Response {
	if (!run.ok) return failure(200, run.error)
	return json(200, JSON.stringify({ ok: true, snapshot: run.snapshot, ...statedFields(stated) }))
}

/** Answers a write that landed: the Snapshot read after it, or, when that read failed, `written_reread_failed` with what the write stated, never the read's own error (ADR 0008). */
export function answerWritten(run: SnapshotRun, stated: Stated): Response {
	if (run.ok) return answerOf(run, stated)
	return json(
		200,
		JSON.stringify({ ok: false, error: writtenRereadFailed(), ...statedFields(stated) }),
	)
}
