import { randomBytes } from "node:crypto"
import { json, type Session, Session as SpikeSession } from "./http"
import { requestResult } from "./request"
import { reset, revokeAll, sql } from "./security-shared"
import {
	BULK_ROWS,
	EXPIRED_ROWS,
	exchangeCode,
	fillExpiredResetRows,
	fillVerification,
	isInvalidGrant,
	LIVE_ROWS,
	MAX_REVOKE_MS,
	pendingAuthorizationCodes,
	revokeWebGrant,
	rowsWithIdPrefix,
	verificationDatabase,
} from "./security-verification-shared"
import { authorizeCode } from "./security-web"

async function issueWebCode(session: Session): Promise<{ code: string; verifier: string } | null> {
	const verifier = randomBytes(32).toString("base64url")
	const code = await authorizeCode(session, verifier)
	return code === null ? null : { code, verifier }
}

/**
 * The library purges every expired `verification` row from inside the Worker on one anonymous
 * reset-password lookup (`!old` shares that token's identifier). The purge lands while the revoke
 * is reading the same table: an offset scan skips the pending code when the table shrinks under
 * it, and one statement cannot. The code must be dead after the revoke returns 200.
 */
export async function checkRevokeHoldsUnderConcurrentVerificationDeletes(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	sql(scratch, "delete from verification")
	const issued = await issueWebCode(session)
	const grantId = await revokeWebGrant(session)
	if (issued === null || grantId === null) return false
	const database = verificationDatabase(scratch)
	try {
		fillExpiredResetRows(database, EXPIRED_ROWS, "spike-probe")
		fillVerification(database, "~new", LIVE_ROWS, "2099-01-01T00:00:00.000Z")
		const revoke = requestResult(session, "/api/auth/oauth2/grants/revoke", json({ id: grantId }))
		await Bun.sleep(60)
		const cleanup = new SpikeSession().request(
			"/api/auth/reset-password/spike-probe?callbackURL=%2F",
			{ redirect: "manual" },
		)
		const revoked = await revoke
		await (await cleanup).text()
		reset(scratch)
		const exchange = await exchangeCode(session, issued)
		return (
			revoked.status === 200 &&
			rowsWithIdPrefix(database, "!old") === 0 &&
			pendingAuthorizationCodes(database) === 0 &&
			isInvalidGrant(exchange)
		)
	} finally {
		database.run("delete from verification where id like '~new%'")
		database.close()
	}
}

/**
 * 40,000 inert rows must not slow the revoke down to a paged scan. This cannot read D1's
 * per-invocation query count, so the bound is wall time: the offset scan needed 2 s here.
 */
export async function checkRevokeIsConstantQueryCount(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	await revokeAll(session)
	sql(scratch, "delete from verification")
	const issued = await issueWebCode(session)
	const grantId = await revokeWebGrant(session)
	if (issued === null || grantId === null) return false
	const database = verificationDatabase(scratch)
	try {
		fillVerification(database, "~bulk", BULK_ROWS, "2099-01-01T00:00:00.000Z")
		const started = Date.now()
		const revoked = await requestResult(
			session,
			"/api/auth/oauth2/grants/revoke",
			json({ id: grantId }),
		)
		const elapsedMs = Date.now() - started
		reset(scratch)
		const exchange = await exchangeCode(session, issued)
		return (
			revoked.status === 200 &&
			elapsedMs < MAX_REVOKE_MS &&
			pendingAuthorizationCodes(database) === 0 &&
			isInvalidGrant(exchange)
		)
	} finally {
		database.run("delete from verification where id like '~bulk%'")
		database.close()
	}
}
