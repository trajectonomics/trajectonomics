import type { Database } from "bun:sqlite"
import { openScratchDatabase } from "./database"
import { listGrants, tokenRequest } from "./flow"
import type { Session } from "./http"
import { WEB, WEB_REDIRECT_URI } from "./security-shared"
import type { RequestResult } from "./types"

export const EXPIRED_ROWS = 20_000
export const LIVE_ROWS = 20_000
/** Twice the reviewer's 20k sample, which took 1.0 s with the offset scan on this machine. */
export const BULK_ROWS = 40_000
export const MAX_REVOKE_MS = 1_000

/** Inert `verification` rows; the `~` prefix sorts after a random Better Auth id. */
export function fillVerification(
	database: Database,
	prefix: string,
	count: number,
	expiresAt: string,
): void {
	database.run(insertRows(prefix, count, "'~filler'||i", expiresAt))
}

/**
 * Expired rows that share one reset-password identifier and sort before every Better Auth id. One
 * anonymous `GET /reset-password/<token>` makes the library delete all of them, by identifier, from
 * inside the Worker.
 */
export function fillExpiredResetRows(database: Database, count: number, token: string): void {
	database.run(insertRows("!old", count, `'reset-password:${token}'`, "2020-01-01T00:00:00.000Z"))
}

function insertRows(prefix: string, count: number, identifier: string, expiresAt: string): string {
	return `with recursive n(i) as (select 1 union all select i+1 from n where i<${count}) insert into verification (id,identifier,value,expiresAt,createdAt,updatedAt) select '${prefix}'||printf('%07d',i),${identifier},'{}','${expiresAt}','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z' from n`
}

export function pendingAuthorizationCodes(database: Database): number {
	return countRows(
		database,
		"select count(*) as n from verification where value like '%authorization_code%'",
	)
}

export function rowsWithIdPrefix(database: Database, prefix: string): number {
	return countRows(database, `select count(*) as n from verification where id like '${prefix}%'`)
}

function countRows(database: Database, query: string): number {
	const row = database.query(query).get() as { n?: number } | null
	return Number(row?.n ?? -1)
}

/** The scratch D1 file, opened for a case that must write while the Worker is mid-request. */
export function verificationDatabase(scratch: string): Database {
	return openScratchDatabase(scratch)
}

export async function revokeWebGrant(session: Session): Promise<string | null> {
	const grant = (await listGrants(session)).grants.find((candidate) => candidate.clientId === WEB)
	return grant?.id ?? null
}

export function exchangeCode(session: Session, issued: { code: string; verifier: string }) {
	return tokenRequest(session, {
		grant_type: "authorization_code",
		code: issued.code,
		client_id: WEB,
		redirect_uri: WEB_REDIRECT_URI,
		code_verifier: issued.verifier,
	})
}

export function isInvalidGrant(result: RequestResult): boolean {
	return result.status === 400 && result.body["error"] === "invalid_grant"
}
