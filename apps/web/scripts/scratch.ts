import { rmSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const made = new Set<string>()
let armed = false

/** Removes every scratch directory still held, never stopping at one that will not go. */
function sweep(): void {
	for (const dir of made) {
		try {
			rmSync(dir, { recursive: true, force: true })
		} catch {
			// Left for the next sweep of the temporary directory; the rest still go.
		}
	}
	made.clear()
}

/**
 * Has the sweep also run on exit, and on SIGINT or SIGTERM (a timeout or a cancelled task). After
 * the sweep each handler removes itself and re-raises the signal, so the parent sees a child killed
 * by that signal rather than one that exited 128 plus its number.
 */
function arm(): void {
	if (armed) return
	armed = true
	process.on("exit", sweep)
	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		process.on(signal, () => {
			sweep()
			process.removeAllListeners(signal)
			process.kill(process.pid, signal)
		})
	}
}

/** A fresh directory under the system temporary directory, removed on exit or on a kill signal. */
export async function makeScratch(prefix: string): Promise<string> {
	arm()
	const dir = await mkdtemp(join(tmpdir(), prefix))
	made.add(dir)
	return dir
}

/** Removes a scratch directory now; removing one twice is harmless. */
export async function removeScratch(dir: string): Promise<void> {
	made.delete(dir)
	await rm(dir, { recursive: true, force: true })
}
