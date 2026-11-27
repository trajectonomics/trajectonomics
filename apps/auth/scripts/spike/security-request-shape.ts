import { createHash, randomBytes } from "node:crypto"
import { deviceCodeRequest } from "./flow"
import { form, type Session } from "./http"
import { requestResult } from "./request"
import { COLLECTOR, DATA, RELAY, reset, WEB, WEB_REDIRECT_URI } from "./security-shared"
import type { RequestResult } from "./types"

function isInvalidRequest(result: RequestResult): boolean {
	return result.status === 400 && result.body["error"] === "invalid_request"
}

/**
 * A JSON body advertised with a form media-type parameter must be rejected before the library
 * form-parses it: the two parsers would disagree about the resources the request names.
 */
export async function checkDeviceCodeContentTypeSmugglingRejected(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	const body = JSON.stringify({
		x: `&client_id=${COLLECTOR}&scope=openid offline_access&resource=${DATA}&resource=${RELAY}&`,
	})
	const result = await requestResult(session, "/api/auth/device/code", {
		method: "POST",
		headers: { "content-type": "application/json; x=application/x-www-form-urlencoded" },
		body,
	})
	return isInvalidRequest(result)
}

/**
 * POST `/oauth2/authorize` must be rejected: the library parses its body before the gate runs,
 * so a repeated `resource` collapses to its last value.
 */
export async function checkPostAuthorizeRejected(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	const challenge = createHash("sha256")
		.update(randomBytes(32).toString("base64url"))
		.digest("base64url")
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
	const post = (search: URLSearchParams): Promise<RequestResult> =>
		requestResult(session, "/api/auth/oauth2/authorize", {
			...form(search.toString()),
			redirect: "manual",
		})
	const single = await post(params)
	params.append("resource", RELAY)
	const doubled = await post(params)
	return [single, doubled].every(isInvalidRequest)
}

/** A device authorization request must name at least one scope. */
export async function checkEmptyScopeDeviceRequestRejected(
	session: Session,
	scratch: string,
): Promise<boolean> {
	reset(scratch)
	const results = [
		await deviceCodeRequest(session, COLLECTOR, { resources: [DATA] }),
		await deviceCodeRequest(session, COLLECTOR, { scope: "", resources: [DATA] }),
		await deviceCodeRequest(session, COLLECTOR, { scope: "   ", resources: [DATA] }),
	]
	return results.every(isInvalidRequest)
}
