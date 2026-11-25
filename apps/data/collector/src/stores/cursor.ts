import { Database } from "bun:sqlite"
import type { CursorRun } from "../extract/cursor"

type RawRun = {
	run_id: string
	model: string | null
	usage_json: string | null
	created_at: string
}

/** Returns whether one `sdk-agent-store` database has any populated usage at all, ignoring `--since`. */
export function cursorStoreHasUsage(path: string): boolean {
	try {
		const db = new Database(path, { readonly: true })
		try {
			const row = db
				.query("SELECT 1 FROM runs WHERE usage_json IS NOT NULL AND usage_json != '' LIMIT 1")
				.get()
			return row !== null
		} finally {
			db.close()
		}
	} catch {
		return false
	}
}

/** Reads populated Cursor usage rows from one `sdk-agent-store` database. */
export function readCursorRuns(path: string, sinceIso: string | null): CursorRun[] {
	try {
		const db = new Database(path, { readonly: true })
		try {
			const sql =
				sinceIso === null
					? "SELECT run_id, model, usage_json, created_at FROM runs WHERE usage_json IS NOT NULL AND usage_json != ''"
					: "SELECT run_id, model, usage_json, created_at FROM runs WHERE usage_json IS NOT NULL AND usage_json != '' AND created_at >= ?"
			const statement = db.query(sql)
			const raw = (sinceIso === null ? statement.all() : statement.all(sinceIso)) as RawRun[]
			return raw.map((row) => ({
				runId: row.run_id,
				model: row.model,
				usageJson: row.usage_json,
				createdAt: row.created_at,
			}))
		} finally {
			db.close()
		}
	} catch {
		return []
	}
}
