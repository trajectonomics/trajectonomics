import { type AppError, isAppError } from "../errors"
import type { RestoreCounts, Store } from "../store"
import { addRow, checkRecord, type Decoded, decodeRecord, emptyRows, identityOf } from "./decode"
import { FORMAT_VERSION, type Layout, READABLE_LAYOUTS } from "./format"
import { exactKeys, invalid, parseLine } from "./invalid"

/** Rows restored per record type, the seeded personal entity included. */
export type ImportCounts = RestoreCounts

const HEADER_KEYS = ["record", "formatVersion", "schemaVersion"]

/**
 * The layout a header names. The format version must match exactly; the schema version must be one
 * of the explicit layouts this build reads, never a guess (cli ADR-0048).
 */
function checkHeader(line: string, schemaVersion: number): AppError | Layout {
	const path = "line.1"
	const header = parseLine(line, path)
	if (isAppError(header)) return header
	if (header["record"] !== "header") return invalid(`${path}.record`, 'must be "header"')
	const wrongKeys = exactKeys(header, HEADER_KEYS, path)
	if (wrongKeys) return wrongKeys
	if (header["formatVersion"] !== FORMAT_VERSION) {
		const reason = `${JSON.stringify(header["formatVersion"])} is not a version this build reads (${FORMAT_VERSION})`
		return invalid(`${path}.formatVersion`, reason, {
			expected: FORMAT_VERSION,
			actual: header["formatVersion"],
		})
	}
	const readable = Object.keys(READABLE_LAYOUTS).map(Number)
	const version = header["schemaVersion"]
	const layout = typeof version === "number" ? READABLE_LAYOUTS[version] : undefined
	if (layout === undefined) {
		const reason = `${JSON.stringify(version)} is not a version this build reads (${readable.join(", ")}; the store is at ${schemaVersion})`
		return invalid(`${path}.schemaVersion`, reason, { expected: readable, actual: version })
	}
	return layout
}

function linesOf(text: string): string[] {
	return (text.endsWith("\n") ? text.slice(0, -1) : text).split("\n")
}

/** Refuses a record whose identity an earlier line already used. */
function repeated(decoded: Decoded, seen: Map<string, number>, line: number): AppError | null {
	const { key, field } = identityOf(decoded)
	const firstLine = seen.get(key)
	if (firstLine === undefined) {
		seen.set(key, line)
		return null
	}
	const reason = `repeats the ${decoded.type} ${field} of line ${firstLine}`
	return invalid(`line.${line}.${field}`, reason, { firstLine })
}

function decodeAll(lines: readonly string[], entityId: string, layout: Layout) {
	const rows = emptyRows()
	const seen = new Map<string, number>()
	for (const [index, text] of lines.entries()) {
		const line = index + 2
		const path = `line.${line}`
		const record = parseLine(text, path)
		if (isAppError(record)) return record
		const decoded = decodeRecord(record, path, layout)
		if (isAppError(decoded)) return decoded
		const broken = checkRecord(decoded, entityId, path) ?? repeated(decoded, seen, line)
		if (broken) return broken
		addRow(rows, decoded)
	}
	if (rows.entity.length === 0) {
		return invalid("entity", "the file must hold exactly one entity record, the personal entity")
	}
	return rows
}

/**
 * Restores a canonical JSONL export into `store`, which must hold only the seeded personal
 * entity. The header and every record are checked before any row is written; the rows are then
 * written verbatim in one transaction, so a failure anywhere leaves the database unchanged.
 */
export function importJsonl(text: string, store: Store): ImportCounts | AppError {
	const schemaVersion = store.schemaVersion()
	if (isAppError(schemaVersion)) return schemaVersion
	const [header = "", ...records] = linesOf(text)
	const layout = checkHeader(header, schemaVersion)
	if (isAppError(layout)) return layout
	const rows = decodeAll(records, store.entityId, layout)
	return isAppError(rows) ? rows : store.restore(rows)
}
