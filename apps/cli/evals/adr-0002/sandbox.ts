import { chmodSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

/** Where one persona's run keeps its data, its agent workspace, its `traj` shim and its call log. */
export interface RunDirs {
	readonly root: string
	readonly home: string
	readonly bin: string
	readonly workspace: string
	readonly callLog: string
	readonly transcript: string
	readonly stderr: string
}

/** Creates a run's directories. `TRAJ_HOME` is `home`, so the ledger is the run's alone. */
export function makeRunDirs(root: string): RunDirs {
	const dirs = {
		root,
		home: join(root, "home"),
		bin: join(root, "bin"),
		workspace: join(root, "workspace"),
		callLog: join(root, "calls.jsonl"),
		transcript: join(root, "transcript.txt"),
		stderr: join(root, "stderr.txt"),
	}
	for (const dir of [dirs.home, dirs.bin, dirs.workspace]) mkdirSync(dir, { recursive: true })
	return dirs
}

/**
 * The `traj` shim the agent finds first on PATH. It forwards every argument to the release under
 * test, passes its output and exit code through, and appends one JSON line per call to the log.
 */
export function wrapperSource(
	bunPath: string,
	callLog: string,
	releaseArgv: readonly string[],
): string {
	return [
		`#!${bunPath}`,
		`import { appendFileSync } from "node:fs"`,
		`const release = ${JSON.stringify(releaseArgv)}`,
		`const args = process.argv.slice(2)`,
		`const started = performance.now()`,
		`const child = Bun.spawn([...release, ...args], { stdin: "inherit", stdout: "pipe", stderr: "pipe", env: process.env })`,
		`const [out, err] = await Promise.all([new Response(child.stdout).arrayBuffer(), new Response(child.stderr).arrayBuffer()])`,
		`const code = await child.exited`,
		`process.stdout.write(Buffer.from(out))`,
		`process.stderr.write(Buffer.from(err))`,
		`appendFileSync(${JSON.stringify(callLog)}, JSON.stringify({ argv: args, exitCode: code, ms: Math.round(performance.now() - started) }) + "\\n")`,
		`process.exitCode = code`,
		``,
	].join("\n")
}

/** Writes the shim to `bin/traj`, executable. */
export function installTrajWrapper(
	dirs: RunDirs,
	bunPath: string,
	releaseArgv: readonly string[],
): string {
	const path = join(dirs.bin, "traj")
	writeFileSync(path, wrapperSource(bunPath, dirs.callLog, releaseArgv))
	chmodSync(path, 0o755)
	return path
}

/**
 * The agent's PATH: the shim, then the directory holding `node` (npx's shebang needs it), then the
 * system directories. The agent's own binary is started by absolute path, so it is not listed.
 */
export function sandboxPath(binDir: string, nodeDir: string): string {
	return [binDir, nodeDir, "/usr/local/bin", "/usr/bin", "/bin"].join(":")
}
