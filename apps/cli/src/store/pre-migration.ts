import { Database, SQLiteError } from "bun:sqlite"
import { chmodSync, existsSync, readdirSync, renameSync, statSync, unlinkSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { errorCodeOf } from "../error-code"
import { type AppError, fail } from "../errors"
import { FILE_MODE } from "./ledger-file"
import { userVersion } from "./migrations"

/** One copy of the database as it stood before an upgrade migrated it (cli ADR-0050). */
export type PreMigrationCopy = {
	/** The copy's absolute path, beside the database. */
	path: string
	/** The schema version the copy holds, which is the one in its name. */
	schemaVersion: number
	bytes: number
}

const NAME = /^(.+)\.pre-v(\d+)\.bak$/

/** Where the copy of a database at `version` goes: the database's own name, then what it holds. */
export function copyPath(database: string, version: number): string {
	return `${database}.pre-v${version}.bak`
}

/**
 * The copies beside `database`, oldest schema version first. There is at most one per version, so
 * the list is as long as the schema has ever advanced under this ledger.
 */
export function preMigrationCopies(database: string): PreMigrationCopy[] {
	const directory = dirname(database)
	const name = basename(database)
	if (!existsSync(directory)) return []
	const found: PreMigrationCopy[] = []
	for (const entry of readdirSync(directory)) {
		const match = NAME.exec(entry)
		if (match === null || match[1] !== name) continue
		const path = join(directory, entry)
		found.push({ path, schemaVersion: Number(match[2]), bytes: statSync(path).size })
	}
	return found.sort((a, b) => a.schemaVersion - b.schemaVersion)
}

function isBusy(error: unknown): boolean {
	return error instanceof SQLiteError && /^SQLITE_(BUSY|LOCKED)/.test(error.code ?? "")
}

/** A copy that could not be written: the disk, the permissions, or anything else, in that order. */
function copyFailure(path: string, from: number, error: unknown): AppError {
	const code = errorCodeOf(error)
	const details = { from, copy: path }
	switch (code) {
		case "ENOSPC":
		case "EDQUOT":
		case "SQLITE_FULL":
			return fail("disk_full", {
				message: `The disk is full: ${path}`,
				hint: "Free space and retry; traj copies the database before it migrates it.",
				details: { path },
			})
		case "EACCES":
		case "EPERM":
		case "EROFS":
		case "SQLITE_CANTOPEN":
		case "SQLITE_PERM":
		case "SQLITE_READONLY":
		case "SQLITE_READONLY_DIRECTORY":
			return fail("permission_denied", {
				message: `Permission denied for ${path}`,
				hint: "traj copies the database before it migrates it. Make the data directory writable, or set TRAJ_HOME to one that is.",
				details: { path },
			})
		default:
			return fail("migration_failed", {
				message: `The database was not migrated: a copy to go back to could not be written at ${path}.`,
				hint: "Nothing was changed. Retry, or run traj backup first.",
				details,
			})
	}
}

function removeQuietly(path: string): void {
	try {
		unlinkSync(path)
	} catch {
		// A file that is already gone, or that cannot be removed, changes nothing about the outcome.
	}
}

/** The schema version a file holds, opened read-only so the check cannot change it. */
function versionOf(file: string): number {
	const db = new Database(file, { readonly: true })
	try {
		return userVersion(db)
	} finally {
		db.close()
	}
}

/**
 * Writes a consistent copy of `db`, which holds `version`, beside it, before any migration step
 * runs. The copy is made by SQLite itself (`VACUUM INTO`, one read snapshot, WAL included), written
 * under a private temporary name, checked to open at `version`, then renamed onto
 * `<database>.pre-v<version>.bak`, so a copy that exists is whole and an earlier one for the same
 * version is replaced only by a better one. A copy that finds another process already migrated
 * past `version` is discarded and reports `undefined`: that opener holds the real copy.
 * Any failure is a refusal to migrate, never a migration without a copy (cli ADR-0050).
 */
export function copyBeforeMigrating(
	db: Database,
	database: string,
	version: number,
): PreMigrationCopy | AppError | undefined {
	const path = copyPath(database, version)
	const temporary = `${path}.${crypto.randomUUID()}.tmp`
	try {
		db.run(`VACUUM INTO '${temporary.replaceAll("'", "''")}'`)
		chmodSync(temporary, FILE_MODE)
		if (versionOf(temporary) !== version) {
			removeQuietly(temporary)
			return undefined
		}
		renameSync(temporary, path)
		return { path, schemaVersion: version, bytes: statSync(path).size }
	} catch (error) {
		removeQuietly(temporary)
		// A busy database is the caller's `database_busy`, retried like any other write.
		if (isBusy(error)) throw error
		return copyFailure(path, version, error)
	}
}
