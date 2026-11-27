/**
 * The two conditional `oauthConsent` statements `consent-write.ts` issues, over in-memory rows.
 *
 * Rows hold the text a SQLite column holds: `updatedAt` is an ISO string and `scopes`/`resources`
 * are JSON text, because the adapter binds them that way on D1. A binding a test does not expect
 * matches no row, exactly as the real statement would.
 */
import type { D1Database } from "@cloudflare/workers-types"

export type ConsentRow = { id: string } & Record<string, unknown>
export type ConsentStatement = { sql: string; params: unknown[] }

const DELETE_CREATED = `delete from "oauthConsent"`
const RESTORE_MERGED = `update "oauthConsent"`

export class FakeConsentDatabase {
	rows: ConsentRow[]
	statements: ConsentStatement[] = []
	readonly database: D1Database

	constructor(rows: ConsentRow[] = []) {
		this.rows = rows
		this.database = { prepare: (sql: string) => this.prepare(sql) } as unknown as D1Database
	}

	private prepare(sql: string): unknown {
		return {
			bind: (...params: unknown[]) => ({
				run: async () => ({
					success: true,
					results: [],
					meta: { changes: this.apply(sql, params) },
				}),
			}),
		}
	}

	private apply(sql: string, params: unknown[]): number {
		this.statements.push({ sql, params })
		if (sql.startsWith(DELETE_CREATED)) return this.deleteRow(params)
		if (sql.startsWith(RESTORE_MERGED)) return this.restoreRow(params)
		return 0
	}

	private deleteRow([id, updatedAt]: unknown[]): number {
		const before = this.rows.length
		this.rows = this.rows.filter((row) => !(row.id === id && row["updatedAt"] === updatedAt))
		return before - this.rows.length
	}

	private restoreRow([scopes, resources, updatedAt, id, writtenAt]: unknown[]): number {
		const row = this.rows.find(
			(candidate) => candidate.id === id && candidate["updatedAt"] === writtenAt,
		)
		if (row === undefined) return 0
		row["scopes"] = scopes
		row["resources"] = resources
		row["updatedAt"] = updatedAt
		return 1
	}
}
