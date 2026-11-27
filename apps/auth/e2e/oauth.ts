import { createHash, randomBytes } from "node:crypto"

/** The data site's registered redirect, which the browser need not load in a check. */
export const WEB_CALLBACK = "https://trajectonomics.com/data/auth/callback"

/**
 * An authorization-code request for the first-party web client: public, PKCE, and one resource.
 * A browser check drives it to the consent page; nothing here is a secret.
 */
export function authorizePath(state: string): string {
	const verifier = randomBytes(32).toString("base64url")
	const challenge = createHash("sha256").update(verifier).digest("base64url")
	const params = new URLSearchParams({
		client_id: "traj-data-web",
		redirect_uri: WEB_CALLBACK,
		response_type: "code",
		scope: "openid profile email",
		code_challenge: challenge,
		code_challenge_method: "S256",
		state,
	})
	return `/api/auth/oauth2/authorize?${params.toString()}`
}
