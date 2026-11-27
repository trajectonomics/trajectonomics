// The `record-values` Edit's run: the ledger write that states figures ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
// Like every Edit it runs dry first and for real second, then the Snapshot is read again; unlike a plan
// write it also answers what `traj` stated for each row, so the page shows `before`, `value` and `difference` as they are.
import { accountValues, type Snapshot } from "../src/lib/contract"
import { writeCommand } from "../src/lib/edit/edit"
import { type RecordValuesEdit, unknownAccountIds } from "../src/lib/edit/record-values"
import { type RunContext, runTraj } from "./run-traj"
import { answerPreview, failure } from "./serve-edit-answer"
import { answerOf } from "./serve-snapshot-answer"
import type { SnapshotRun } from "./snapshot-run"

/** What the run needs: how to run traj, the Snapshot the page reads, and how to read it again. */
export type RecordValuesRun = {
	traj: RunContext
	held: Snapshot | null
	refresh: () => Promise<SnapshotRun>
}

/** Runs one traj batch, dry or real, decoded as the batch result. */
function write(run: RecordValuesRun, edit: RecordValuesEdit, dryRun: boolean) {
	const command = writeCommand(edit, dryRun)
	return runTraj(run.traj, command.argv, accountValues, command.stdin)
}

/**
 * Runs the Edit: an account the Snapshot does not hold is refused before anything runs (400), a refusal
 * of the batch is answered as data with nothing written, and a write that held answers the new Snapshot
 * with the batch's own result. A preview stops after the dry run and answers its result: nothing is written.
 */
export async function recordValues(
	run: RecordValuesRun,
	edit: RecordValuesEdit,
): Promise<Response> {
	const accounts = run.held?.reads.accounts
	if (accounts === undefined || !accounts.ok) {
		const message = "The Dashboard has no chart of accounts to check these values against."
		return failure(400, { code: "no_accounts", exitCode: 1, message })
	}
	if (unknownAccountIds(edit, accounts.data.accounts).length > 0) {
		const message = "The Edit names an account the Dashboard's Snapshot does not hold."
		return failure(400, { code: "unknown_account", exitCode: 1, message })
	}
	const dry = await write(run, edit, true)
	if (!dry.ok) return failure(200, dry.error)
	if (edit.preview) return answerPreview(dry.data)
	const real = await write(run, edit, false)
	if (!real.ok) return failure(200, real.error)
	return answerOf(await run.refresh(), { result: real.data })
}
