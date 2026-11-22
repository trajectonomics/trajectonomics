import { chmodSync, mkdtempSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const made: string[] = []

/**
 * A fresh directory under the system temporary directory, removed when the test run ends. The only
 * place under `src` allowed to call `mkdtemp`, so no test can leave a `traj-*` directory behind;
 * `src/temp-dir.test.ts` fails on any other caller. Removal is `sweepTempDirs`, which
 * `src/test-setup.ts` (the `bunfig.toml` test preload) runs once after the last file, pass or fail.
 */
export function makeTempDir(prefix = "traj-"): string {
	const dir = mkdtempSync(join(tmpdir(), prefix))
	made.push(dir)
	return dir
}

/** Gives the owner write access to `dir` and every directory under it, so it can be removed. */
function unlock(dir: string): void {
	chmodSync(dir, 0o700)
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) unlock(join(dir, entry.name))
	}
}

/**
 * Removes every directory `makeTempDir` has made so far. Removing one twice is harmless. A test
 * that timed out inside its `try` can leave a directory read-only (several set a home to `0o500`
 * and restore it in `finally`), so a failed removal unlocks the tree and tries again, and one
 * directory that still cannot go never stops the sweep of the rest.
 */
export function sweepTempDirs(): void {
	for (const dir of made.splice(0)) {
		try {
			rmSync(dir, { recursive: true, force: true })
		} catch {
			try {
				unlock(dir)
				rmSync(dir, { recursive: true, force: true })
			} catch {
				// Left for the next sweep of /tmp; the rest of the run's directories still go.
			}
		}
	}
}
