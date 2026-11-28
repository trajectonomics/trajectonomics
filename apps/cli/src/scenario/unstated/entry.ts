import { type AppError, fail, isAppError } from "../../errors"
import { isPlainObject } from "../../json"
import { canonicalJson } from "../../store/canonical"

/** Where a path's value came from. `history` joins it with #687's run-rates (cli ADR-0084). */
export const UNSTATED_SOURCES = ["template"] as const

export type UnstatedSource = (typeof UNSTATED_SOURCES)[number]

/** One document path `traj` wrote, and the source it came from (cli ADR-0084). */
export type UnstatedEntry = { path: string; source: UnstatedSource }

function isSource(value: unknown): value is UnstatedSource {
	return UNSTATED_SOURCES.some((source) => source === value)
}

/** A refusal at the path the record or column was being read from. */
function broken(path: string, reason: string): AppError {
	return fail("invalid_input", { path, message: `${path}: ${reason}` })
}

function entriesOf(value: readonly unknown[], path: string): UnstatedEntry[] | AppError {
	const entries: UnstatedEntry[] = []
	const seen = new Set<string>()
	for (const item of value) {
		if (!isPlainObject(item)) return broken(path, "an entry is not an object")
		const entryPath = item["path"]
		if (typeof entryPath !== "string" || entryPath === "") {
			return broken(path, "an entry's path is empty")
		}
		if (!isSource(item["source"])) return broken(path, "an entry names an unknown source")
		if (seen.has(entryPath)) return broken(path, "two entries name the same path")
		seen.add(entryPath)
		entries.push({ path: entryPath, source: item["source"] })
	}
	return entries
}

/**
 * The entries a stored column or a restored record holds: canonical JSON text, an array, or null
 * for none. Paths come back sorted, and an empty list is the same as null (cli ADR-0084).
 */
export function parseUnstated(
	value: string | readonly unknown[] | null,
	path = "unstated",
): UnstatedEntry[] | AppError {
	if (value === null) return []
	let parsed: unknown = value
	if (typeof value === "string") {
		try {
			parsed = JSON.parse(value)
		} catch {
			return broken(path, "is not JSON")
		}
	}
	if (!Array.isArray(parsed)) return broken(path, "must be an array of entries or null")
	const entries = entriesOf(parsed, path)
	return isAppError(entries) ? entries : sortByPath(entries)
}

/** Entries in the order the column writes them: by path, in UTF-16 code-unit order. */
export function sortByPath(entries: readonly UnstatedEntry[]): UnstatedEntry[] {
	return [...entries].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/** The canonical text a write stores, or null when nothing is unstated: `[]` is never stored. */
export function serializeUnstated(entries: readonly UnstatedEntry[]): string | null {
	return entries.length === 0 ? null : canonicalJson(sortByPath(entries))
}
