// Resolves the `traj` executable for the editable scratch Dashboard: uses the compiled workspace binary
// when it exists and is newer than every file in `apps/cli/src`, otherwise writes a wrapper over source.
import { existsSync, readdirSync, statSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const CLI_SRC_DIR = fileURLToPath(new URL("../../cli/src", import.meta.url))
const CLI_ENTRY = join(CLI_SRC_DIR, "index.ts")
const COMPILED_CLI = fileURLToPath(new URL("../../cli/dist/traj", import.meta.url))

function newestMtimeMs(dir: string): number {
	let newest = 0
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name)
		if (entry.isDirectory()) {
			newest = Math.max(newest, newestMtimeMs(full))
		} else if (!entry.name.endsWith(".test.ts")) {
			newest = Math.max(newest, statSync(full).mtimeMs)
		}
	}
	return newest
}

/** Returns the fresh compiled `traj` binary if up to date, else a wrapper over the CLI source. */
export async function resolveScratchTraj(scratch: string): Promise<string> {
	if (existsSync(COMPILED_CLI) && statSync(COMPILED_CLI).mtimeMs >= newestMtimeMs(CLI_SRC_DIR)) {
		return COMPILED_CLI
	}
	const wrapper = join(scratch, "traj")
	await writeFile(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${CLI_ENTRY}" "$@"\n`, {
		mode: 0o755,
	})
	return wrapper
}
