import { errorMessage } from "../message"
import { requireSecureIssuer } from "./config"
import type { Credentials } from "./credentials"
import { type AuthFetch, postForm } from "./http"

/** File, network, output, issuer and failure hooks, so tests can break the revoke on purpose. */
export type LogoutDeps = {
	fetch: AuthFetch
	read: () => Credentials | null
	remove: () => void
	/** Where the revoke hint points when no credentials could be read. */
	defaultIssuer: string
	log: (line: string) => void
	out: (line: string) => void
}

/** One logout's exit code. */
export type LogoutOutcome = { exitCode: 0 | 1 }

async function revoke(credentials: Credentials, deps: LogoutDeps): Promise<boolean> {
	try {
		requireSecureIssuer(credentials.issuer)
		const response = await postForm(deps.fetch, `${credentials.issuer}/api/auth/oauth2/revoke`, {
			token: credentials.refreshToken,
			token_type_hint: "refresh_token",
			client_id: credentials.clientId,
		})
		return response.ok
	} catch {
		return false
	}
}

/**
 * Revokes best-effort, deletes the file even when reading it failed (a malformed or unsafe file
 * must not survive a sign-out), and says what is left to do.
 */
export async function logout(deps: LogoutDeps): Promise<LogoutOutcome> {
	let credentials: Credentials | null = null
	let readFailed = false
	try {
		credentials = deps.read()
	} catch {
		readFailed = true
	}
	if (credentials === null && !readFailed) {
		deps.out("Not signed in.")
		return { exitCode: 0 }
	}
	const revoked = credentials === null ? false : await revoke(credentials, deps)
	try {
		deps.remove()
	} catch (error) {
		deps.log(`logout: ${errorMessage(error)}`)
		return { exitCode: 1 }
	}
	deps.out("Signed out.")
	if (revoked) return { exitCode: 0 }
	const issuer = credentials?.issuer ?? deps.defaultIssuer
	deps.out(`The grant could not be revoked here; revoke it on ${issuer}/account/.`)
	return { exitCode: 0 }
}
