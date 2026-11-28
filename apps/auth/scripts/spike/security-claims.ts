import { createHash, randomBytes } from "node:crypto"
import type { Session } from "./http"
import { requestResult } from "./request"
import { DATA, reset, WEB, WEB_REDIRECT_URI } from "./security-shared"

function authorizeParams(): URLSearchParams {
	const challenge = createHash("sha256").update(randomBytes(32)).digest("base64url")
	return new URLSearchParams({
		response_type: "code",
		client_id: WEB,
		redirect_uri: WEB_REDIRECT_URI,
		scope: "openid",
		state: "spike",
		code_challenge: challenge,
		code_challenge_method: "S256",
		resource: DATA,
	})
}

function authorizePath(params: URLSearchParams): string {
	return `/api/auth/oauth2/authorize?${params.toString()}`
}

/**
 * OIDC's `claims` parameter is refused with `invalid_request`, while the same authorization
 * request without it still reaches the consent page or the client.
 */
export async function checkClaimsParameterRejected(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	const params = authorizeParams()
	params.set("claims", JSON.stringify({ userinfo: { email: null } }))
	const refused = await requestResult(session, authorizePath(params), {
		redirect: "manual",
		headers: { accept: "text/html" },
	})
	const refusal =
		refused.status === 400 &&
		refused.body["error"] === "invalid_request" &&
		refused.body["error_description"] === "the claims parameter is not supported"
	params.delete("claims")
	const allowed = await session.request(authorizePath(params), {
		redirect: "manual",
		headers: { accept: "text/html" },
	})
	await allowed.text()
	const location = allowed.headers.get("location") ?? ""
	return refusal && allowed.status >= 300 && allowed.status < 400 && location !== ""
}
