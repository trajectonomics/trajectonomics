import { Database } from "bun:sqlite"
import { type AppError, isAppError } from "../errors"
import { guardAt } from "./guard"
import { HEAD, migrate, tooNew, userVersion } from "./migrations"
import { copyBeforeMigrating, type PreMigrationCopy } from "./pre-migration"

/** An open connection at head, and the copy that was written to get it there, if one was. */
export type Connected = { db: Database; copy?: PreMigrationCopy }

/**
 * Opens one connection with the pragmas every connection needs, refusing a database newer than
 * head before anything could write to it, then migrates to head. It never creates the file: the
 * caller has proved the ledger exists, because only `traj init` and `traj restore` create one.
 * A database that holds a schema version, and needs a step, is copied first; an empty one
 * (`traj init`'s version 0) holds nothing to go back to and is not (cli ADR-0050).
 */
export function connect(path: string, busyTimeoutMs: number): Connected | AppError {
	let db: Database | undefined
	let copy: PreMigrationCopy | undefined
	try {
		const opened = guardAt(path, () => new Database(path, { create: false }))
		if (isAppError(opened)) return opened
		db = opened
		const outcome = guardAt(path, () => {
			opened.run(`PRAGMA busy_timeout = ${busyTimeoutMs}`)
			const version = userVersion(opened)
			if (version > HEAD) return tooNew(version)
			opened.run("PRAGMA journal_mode = WAL")
			opened.run("PRAGMA foreign_keys = ON")
			if (version > 0 && version < HEAD) {
				const written = copyBeforeMigrating(opened, path, version)
				if (isAppError(written)) return written
				copy = written
			}
			return migrate(opened)
		})
		if (isAppError(outcome)) {
			opened.close()
			return outcome
		}
		return copy === undefined ? { db: opened } : { db: opened, copy }
	} catch (error) {
		try {
			db?.close()
		} catch {
			// The connection is being abandoned; a close that also fails changes nothing.
		}
		throw error
	}
}
