import { readdirSync, statSync } from "node:fs"
import { basename, dirname, join } from "node:path"

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
	const found: PreMigrationCopy[] = []
	for (const { entry, directory } of entriesBeside(database)) {
		const match = NAME.exec(entry)
		if (match === null || match[1] !== basename(database)) continue
		const path = join(directory, entry)
		const stat = statOf(path)
		// A dangling link, a directory or a file removed since the listing is not a copy.
		if (stat?.isFile() === true) {
			found.push({ path, schemaVersion: Number(match[2]), bytes: Number(stat.size) })
		}
	}
	return found.sort((a, b) => a.schemaVersion - b.schemaVersion)
}

const UNFINISHED = /^(.+)\.pre-v\d+\.bak\..+\.tmp$/

/**
 * The half-written copies a crash left beside `database`: the temporary names a copy has before it
 * is renamed. A copy that is still being written by another traj is listed too, so this is
 * something to read, never something to delete.
 */
export function unfinishedCopies(database: string): string[] {
	return entriesBeside(database)
		.filter(({ entry }) => UNFINISHED.exec(entry)?.[1] === basename(database))
		.map(({ entry, directory }) => join(directory, entry))
		.sort()
}

function entriesBeside(database: string): { entry: string; directory: string }[] {
	const directory = dirname(database)
	try {
		return readdirSync(directory).map((entry) => ({ entry, directory }))
	} catch {
		return []
	}
}

function statOf(path: string): { isFile(): boolean; size: number | bigint } | undefined {
	try {
		return statSync(path)
	} catch {
		return undefined
	}
}
