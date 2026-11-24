// A runner that logs every argv the editor gives traj, then runs the real traj: the spy of the reread tests.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { BINARY } from "./edit-fixture.test-support"
import type { RunContext } from "./run-traj"

/**
 * A traj context whose every call is appended to a log, one line per call, then run for real. `dispose` removes
 * the directory that holds the log and the script; the test calls it when it is done.
 */
export async function spyContext(env: NodeJS.ProcessEnv): Promise<{
	context: RunContext
	log: string
	dispose: () => Promise<void>
}> {
	const dir = await mkdtemp(join(tmpdir(), "traj-web-spy-"))
	const log = join(dir, "argv.log")
	const script = join(dir, "spy.sh")
	await writeFile(log, "")
	await writeFile(script, 'echo "$*" >> "$SPY_LOG"\nshift\nexec "$TRAJ_REAL" "$@"\n')
	// `sh spy.sh x ARGV...`: the first argument stands in for the binary's own name and is dropped above.
	const context: RunContext = {
		binary: "/bin/sh",
		prefix: [script, "traj"],
		env: { ...env, SPY_LOG: log, TRAJ_REAL: BINARY },
	}
	const dispose = () => rm(dir, { recursive: true, force: true })
	return { context, log, dispose }
}

/** The calls logged so far, one string each, with the stand-in name dropped. */
export async function calls(log: string): Promise<string[]> {
	return (await readFile(log, "utf8"))
		.split("\n")
		.filter((line) => line !== "")
		.map((line) => line.replace(/^traj /, ""))
}

/** Empties the log. */
export async function clearCalls(log: string): Promise<void> {
	await writeFile(log, "")
}
