import { homedir } from "node:os"
import { authIssuer, DEFAULT_AUTH_ISSUER } from "../auth/config"
import { FILE_DEPS } from "../auth/credential-fs"
import { credentialsPath, deleteCredentials, readCredentials } from "../auth/credentials"
import { logout } from "../auth/logout"

const USAGE = "Usage: bun src/cli.ts logout"

/** The issuer for the revoke hint when the credentials file could not be read. */
function hintIssuer(env: Record<string, string | undefined>): string {
	try {
		return authIssuer(env)
	} catch {
		return DEFAULT_AUTH_ISSUER
	}
}

/** Runs `logout` against the real credentials file. */
export async function runLogoutCommand(
	argv: readonly string[],
	env: Record<string, string | undefined> = process.env,
): Promise<void> {
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
		defaultIssuer: hintIssuer(env),
		log: (line) => console.error(line),
		out: (line) => console.log(line),
	})
	process.exitCode = outcome.exitCode
}
