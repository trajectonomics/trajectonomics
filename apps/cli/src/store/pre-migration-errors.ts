import { errorCodeOf } from "../error-code"
import { type AppError, fail } from "../errors"

const UNCHANGED = "The database was not migrated and is unchanged."

/** A copy that could not be written: the disk, the permissions, or anything else, in that order. */
export function copyFailure(path: string, from: number, error: unknown): AppError {
	switch (errorCodeOf(error)) {
		case "ENOSPC":
		case "EDQUOT":
		case "SQLITE_FULL":
			return fail("disk_full", {
				message: `The disk is full: ${path}. ${UNCHANGED}`,
				hint: "Free space and retry; traj copies the database before it migrates it.",
				details: { path, from },
			})
		case "EACCES":
		case "EPERM":
		case "EROFS":
		case "SQLITE_CANTOPEN":
		case "SQLITE_PERM":
		case "SQLITE_READONLY":
		case "SQLITE_READONLY_DIRECTORY":
			return fail("permission_denied", {
				message: `Permission denied for ${path}. ${UNCHANGED}`,
				hint: "traj copies the database before it migrates it. Make the data directory writable, or set TRAJ_HOME to one that is.",
				details: { path, from },
			})
		default:
			return fail("migration_failed", {
				message: `The database was not migrated: a copy to go back to could not be written at ${path}. ${UNCHANGED}`,
				hint: "Retry, or run traj backup first.",
				details: { from, copy: path },
			})
	}
}
