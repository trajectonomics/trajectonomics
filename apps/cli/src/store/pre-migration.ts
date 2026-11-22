import { Database, SQLiteError } from "bun:sqlite"
import {
	chmodSync,
	closeSync,
	fsyncSync,
	openSync,
	renameSync,
	statSync,
	unlinkSync,
} from "node:fs"
import { dirname } from "node:path"
import type { AppError } from "../errors"
import { FILE_MODE } from "./ledger-file"
import { userVersion } from "./migrations"
import { copyFailure } from "./pre-migration-errors"
import { copyPath, type PreMigrationCopy } from "./pre-migration-files"

function isBusy(error: unknown): boolean {
	return error instanceof SQLiteError && /^SQLITE_(BUSY|LOCKED)/.test(error.code ?? "")
}

function removeQuietly(path: string): void {
	try {
		unlinkSync(path)
	} catch {
		// A file that is already gone, or that cannot be removed, changes nothing about the outcome.
	}
}

/** What opening a finished copy shows: its schema version, and whether SQLite finds it sound. */
function inspected(file: string): { version: number; sound: boolean } {
	const db = new Database(file, { readonly: true })
	try {
		const check = db.query<{ quick_check: string }, []>("PRAGMA quick_check").all()
		return {
			version: userVersion(db),
			sound: check.length === 1 && check[0]?.quick_check === "ok",
		}
	} finally {
		db.close()
	}
}

/** Forces `path`'s bytes to stable storage, which `VACUUM INTO` does not: the migration that follows does. */
function flush(path: string, mode: "r+" | "r"): void {
	const fd = openSync(path, mode)
	try {
		fsyncSync(fd)
	} finally {
		closeSync(fd)
	}
}

/** Makes the rename durable. A directory cannot be opened on Windows, and the copy is whole without it. */
function flushDirectory(directory: string): void {
	if (process.platform === "win32") return
	try {
		flush(directory, "r")
	} catch {
		// The file itself is flushed; a filesystem that refuses to sync a directory loses nothing else.
	}
}

/**
 * Writes a consistent copy of `db`, which holds `version`, beside it, before any migration step
 * runs. The copy is made by SQLite itself (`VACUUM INTO`, one read snapshot, WAL included), written
 * under a private temporary name, checked to open at `version` and to pass `quick_check`, flushed
 * to disk, then renamed onto
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
		db.run("VACUUM INTO ?", [temporary])
		chmodSync(temporary, FILE_MODE)
		const { version: held, sound } = inspected(temporary)
		if (held !== version) {
			removeQuietly(temporary)
			return undefined
		}
		if (!sound) throw new Error("the copy failed quick_check")
		flush(temporary, "r+")
		renameSync(temporary, path)
		flushDirectory(dirname(path))
		return { path, schemaVersion: version, bytes: statSync(path).size }
	} catch (error) {
		removeQuietly(temporary)
		// A busy database is the caller's `database_busy`, retried like any other write.
		if (isBusy(error)) throw error
		return copyFailure(path, version, error)
	}
}
