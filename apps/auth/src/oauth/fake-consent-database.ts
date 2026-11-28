/**
 * The D1 statements the consent path issues, over in-memory rows.
 *
 * Rows hold the text a SQLite column holds: `updatedAt` is an ISO string and `scopes`/`resources`
 * are JSON text, because the adapter binds them that way on D1. A binding a test does not expect
 * matches no row, exactly as the real statement would.
 *
 * The token rows are one store for both views: the adapter reads them as `oauthAccessToken` and
 * `oauthRefreshToken`, and the snapshot and deletes in `family.ts` see the same rows, so a test
 * seeds a family once and both paths agree on it.
 */
import type { D1Database } from "@cloudflare/workers-types"
import { fakeD1, type RanStatement, type StatementResult } from "./fake-d1"

export type ConsentRow = { id: string } & Record<string, unknown>
/** An access or refresh token row, tagged with the model it belongs to. */
export type TokenRow = ConsentRow & { model: string }

const DELETE_CREATED = `delete from "oauthConsent"`
const UPDATE_CONSENT = `update "oauthConsent"`
const SNAPSHOT_TOKENS = `select 'a' as kind`
const DELETE_ACCESS_TOKENS = `delete from "oauthAccessToken"`
const DELETE_REFRESH_TOKENS = `delete from "oauthRefreshToken"`

export class FakeConsentDatabase {
	rows: ConsentRow[]
	/** The grant's access and refresh token rows: what a snapshot lists and a delete removes. */
	tokens: TokenRow[] = []
	/** Every statement that ran, in order, with the values it bound. */
	readonly statements: RanStatement[] = []
	/** The SQL of each batch, in order: a test can say the two deletes were one transaction. */
	readonly batches: string[][] = []
	/** Runs once the token snapshot returned: whatever lands before the caller's next statement. */
	afterSnapshot: (() => void) | undefined
	readonly database: D1Database

	constructor(rows: ConsentRow[] = []) {
		this.rows = rows
		this.database = fakeD1({
			ran: this.statements,
			batches: this.batches,
			handle: (sql, params) => this.execute(sql, params),
		})
	}

	/** Statements run so far: one per lone statement, and one per statement inside a batch. */
	get queries(): number {
		return this.statements.length
	}

	/** The statements that read or write access or refresh tokens: the family's own queries. */
	get tokenStatements(): RanStatement[] {
		return this.statements.filter(
			({ sql }) => sql.includes(`"oauthAccessToken"`) || sql.includes(`"oauthRefreshToken"`),
		)
	}

	private execute(sql: string, params: unknown[]): StatementResult {
		if (sql.startsWith(DELETE_CREATED)) return { results: [], changes: this.deleteRow(params) }
		if (sql.startsWith(UPDATE_CONSENT)) return { results: [], changes: this.restoreRow(params) }
		if (sql.startsWith(SNAPSHOT_TOKENS)) return { results: this.snapshot(params), changes: 0 }
		if (sql.startsWith(DELETE_ACCESS_TOKENS))
			return { results: [], changes: this.deleteTokens("oauthAccessToken", params) }
		if (sql.startsWith(DELETE_REFRESH_TOKENS))
			return { results: [], changes: this.deleteTokens("oauthRefreshToken", params) }
		return { results: [], changes: 0 }
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

	/** The ids the one snapshot statement lists, for the owner its two parameters name. */
	private snapshot([clientId, userId]: unknown[]): unknown[] {
		const results = this.tokens
			.filter((row) => row["clientId"] === clientId && row["userId"] === userId)
			.map((row) => ({ kind: row.model === "oauthAccessToken" ? "a" : "r", id: row.id }))
		this.afterSnapshot?.()
		return results
	}

	private deleteTokens(model: string, [bound]: unknown[]): number {
		const listed = new Set(jsonIds(bound))
		const before = this.tokens.length
		this.tokens = this.tokens.filter((row) => row.model !== model || !listed.has(row.id))
		return before - this.tokens.length
	}
}

/** The id array a `json_each` statement binds: the JSON text the caller sends, or nothing. */
function jsonIds(bound: unknown): string[] {
	if (typeof bound !== "string") return []
	try {
		const parsed: unknown = JSON.parse(bound)
		return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []
	} catch {
		return []
	}
}
