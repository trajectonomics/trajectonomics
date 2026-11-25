import { Database } from "bun:sqlite"

/** One row from OpenCode's `message` or `session_message` table, before parsing. */
export type OpenCodeRow = {
	id: string
	timeCreated: number
	data: string
	schema: "message" | "session_message"
}

type RawRow = { id: string; time_created: number; data: string }

function tableExists(db: Database, name: string): boolean {
	return (
		db.query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !== null
	)
}

function readTable(
	db: Database,
	table: "message" | "session_message",
	sinceMs: number | null,
): OpenCodeRow[] {
	const assistant = table === "session_message" ? "type = 'assistant'" : "1 = 1"
	const sql =
		sinceMs === null
			? `SELECT id, time_created, data FROM ${table} WHERE ${assistant}`
			: `SELECT id, time_created, data FROM ${table} WHERE ${assistant} AND time_created >= ?`
	const statement = db.query(sql)
	const raw = (sinceMs === null ? statement.all() : statement.all(sinceMs)) as RawRow[]
	return raw.map((row) => ({
		id: row.id,
		timeCreated: row.time_created,
		data: row.data,
		schema: table,
	}))
}

/** Opens OpenCode's SQLite database read-only, or returns null when it is absent or unreadable. */
export function openOpenCodeDatabase(path: string): Database | null {
	try {
		return new Database(path, { readonly: true })
	} catch {
		return null
	}
}

/** Reads both OpenCode message schemas that exist on a machine, keeping only the needed columns. */
export function readOpenCodeRows(db: Database, sinceMs: number | null): OpenCodeRow[] {
	const rows: OpenCodeRow[] = []
	if (tableExists(db, "message")) rows.push(...readTable(db, "message", sinceMs))
	if (tableExists(db, "session_message")) rows.push(...readTable(db, "session_message", sinceMs))
	return rows
}
