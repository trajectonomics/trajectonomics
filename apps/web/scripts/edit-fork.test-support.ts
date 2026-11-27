import { writeCommand } from "../src/lib/edit/command"
import { singleWriteEditSchema } from "../src/lib/edit/edit"
import { BINARY, ledgerHome, setupEditor } from "./edit-fixture.test-support"

/**
 * Forks a plan in the scratch ledger as a terminal would, with the argv a copy-plan Edit runs, for a test that
 * needs a plan to edit and does not pin the copy itself. It skips the Snapshot read an Edit ends with.
 */
export async function forkInTerminal(name: string, from = "base"): Promise<void> {
	await setupEditor()
	const { argv } = writeCommand(
		singleWriteEditSchema.parse({ kind: "copy-plan", from, name }),
		false,
	)
	const run = Bun.spawnSync([BINARY, ...argv], { env: { ...process.env, TRAJ_HOME: ledgerHome() } })
	if (run.exitCode !== 0) throw new Error(run.stderr.toString() || run.stdout.toString())
}
