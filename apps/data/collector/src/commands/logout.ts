import { homedir } from "node:os"
import {
	type Credentials,
	credentialsPath,
	deleteCredentials,
	FILE_DEPS,
	readCredentials,
} from "../auth/credentials"
import { type AuthFetch, postForm } from "../auth/http"
import { errorMessage } from "../message"

const USAGE = "Usage: bun src/cli.ts logout"

/** File, network and output hooks, so tests can fail the revoke on purpose. */
export type LogoutDeps = {
	fetch: AuthFetch
	read: () => Credentials | null
	remove: () => void
	log: (line: string) => void
	out: (line: string) => void
}

/** One logout's exit code. */
export type LogoutOutcome = { exitCode: 0 | 1 }

async function revoke(credentials: Credentials, deps: LogoutDeps): Promise<boolean> {
	try {
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

/** Revokes best-effort, deletes the file either way, and says what is left to do. */
export async function logout(deps: LogoutDeps): Promise<LogoutOutcome> {
	let credentials: Credentials | null
	try {
		credentials = deps.read()
	} catch (error) {
		deps.log(`logout: ${errorMessage(error)}`)
		return { exitCode: 1 }
	}
	if (credentials === null) {
		deps.out("Not signed in.")
		return { exitCode: 0 }
	}
	const revoked = await revoke(credentials, deps)
	try {
		deps.remove()
	} catch (error) {
		deps.log(`logout: ${errorMessage(error)}`)
		return { exitCode: 1 }
	}
	deps.out("Signed out.")
	if (revoked) return { exitCode: 0 }
	deps.out(
		"The grant could not be revoked here; revoke it on https://auth.trajectonomics.com/account/.",
	)
	return { exitCode: 0 }
}

/** Runs `logout` against the real credentials file. */
export async function runLogoutCommand(argv: readonly string[]): Promise<void> {
	if (argv.some((arg) => arg === "--help" || arg === "-h")) {
		console.log(USAGE)
		return
	}
	if (argv.length > 0) {
		console.error(`Unknown argument: ${argv[0]}\n${USAGE}`)
		process.exitCode = 1
		return
	}
	const path = credentialsPath(homedir())
	const outcome = await logout({
		fetch: (url, init) => fetch(url, init),
		read: () => readCredentials(path, FILE_DEPS),
		remove: () => deleteCredentials(path, FILE_DEPS),
		log: (line) => console.error(line),
		out: (line) => console.log(line),
	})
	process.exitCode = outcome.exitCode
}
