import { join } from "node:path"
import { makeTempDir } from "../temp-dir"

/** A backup path that does not exist yet, so the command under test is the one that creates it. */
export function backupPath(): string {
	return join(makeTempDir("traj-backup-"), "backup")
}
