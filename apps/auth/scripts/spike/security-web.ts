import { createHash } from "node:crypto"
import { json, type Session } from "./http"
import { requestResult } from "./request"
import { COLLECTOR, DATA, RELAY, reset, WEB, WEB_REDIRECT_URI } from "./security-shared"

/** Drives authorize -> consent accept -> returns the issued code. */
export async function authorizeCode(session: Session, verifier: string): Promise<string | null> {
	const challenge = createHash("sha256").update(verifier).digest("base64url")
	const params = new URLSearchParams({
		response_type: "code",
		client_id: WEB,
		redirect_uri: WEB_REDIRECT_URI,
		scope: "openid",
		state: "spike",
		code_challenge: challenge,
		code_challenge_method: "S256",
		resource: DATA,
	})
	const response = await session.request(`/api/auth/oauth2/authorize?${params}`, {
		redirect: "manual",
		headers: { accept: "text/html" },
	})
	const location = response.headers.get("location")
	if (location === null || !location.includes("/consent?")) return null
	const consent = await requestResult(
		session,
		"/api/auth/oauth2/consent",
		json({ accept: true, oauth_query: location.slice(location.indexOf("?") + 1) }),
	)
	const url = typeof consent.body["url"] === "string" ? consent.body["url"] : null
	return url === null ? null : new URL(url).searchParams.get("code")
}

export async function checkDeleteConsentDisabled(session: Session): Promise<boolean> {
	const result = await requestResult(
		session,
		"/api/auth/oauth2/delete-consent",
		json({ id: "not-a-grant" }),
	)
	return result.status === 404
}

export async function checkSmuggledJsonResource(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	const headers = { "content-type": "application/json; x=application/x-www-form-urlencoded" }
	const body = JSON.stringify({
		client_id: COLLECTOR,
		scope: "openid offline_access",
		resource: [DATA, RELAY],
	})
	const plain = await requestResult(session, "/api/auth/device/code", {
		method: "POST",
		headers,
		body,
	})
	const withQuery = await requestResult(
		session,
		`/api/auth/device/code?resource=${encodeURIComponent(DATA)}`,
		{ method: "POST", headers, body },
	)
	return [plain, withQuery].every(
		(result) => result.status === 400 && result.body["error"] === "invalid_target",
	)
}
