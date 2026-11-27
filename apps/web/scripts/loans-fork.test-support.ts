// Forks a plan with a What-if session's changes straight through `traj`, to read the content hash of the plan
// they make, without the Snapshot read an Edit ends with.
import { writeCommand } from "../src/lib/edit/command"
import { type Edit, singleWriteEditSchema } from "../src/lib/edit/edit"
import { BINARY } from "./edit-fixture.test-support"
import { env, hashOf } from "./loans-ledger.test-support"

type Copy = Extract<Edit, { kind: "copy-plan" }>

/**
 * Forks the plan with the changes straight through `traj scenario fork`, the command a copy-plan Edit runs, and
 * answers the copy's content hash. It skips the Snapshot read an Edit ends with, which projects every plan the
 * editor follows and so costs more with each copy.
 */
export function forkHash(
	from: string,
	name: string,
	changes: Pick<Copy, "sets" | "removals"> | null,
): string {
	// Parsed as the server parses the body, so a change its guards refuse fails here too.
	const edit = singleWriteEditSchema.parse({
		kind: "copy-plan",
		from,
		name,
		sets: changes?.sets ?? [],
		removals: changes?.removals ?? [],
	})
	const { argv } = writeCommand(edit, false)
	const run = Bun.spawnSync([BINARY, ...argv], { env: env() })
	if (run.exitCode !== 0) throw new Error(run.stderr.toString() || run.stdout.toString())
	return hashOf(name)
}
