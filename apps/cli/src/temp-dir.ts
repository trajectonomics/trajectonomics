import { mkdtempSync, rmSync } from "node:fs"
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

/** Removes every directory `makeTempDir` has made so far. Removing one twice is harmless. */
export function sweepTempDirs(): void {
	for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
}
