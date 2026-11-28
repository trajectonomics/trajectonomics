import { homedir } from "node:os"
import { GRANT_LIMIT_DAYS } from "../auth/config"
import { FILE_DEPS } from "../auth/credential-fs"
import { type Credentials, credentialsPath, readCredentials } from "../auth/credentials"
import { errorMessage } from "../message"

const DAY_MS = 86_400_000
const USAGE = "Usage: bun src/cli.ts whoami"

/** Whole days until auth's absolute limit, floored and never negative. */
export function daysLeft(grantStartedAt: string, nowMs: number): number {
	const expiresAtMs = Date.parse(grantStartedAt) + GRANT_LIMIT_DAYS * DAY_MS
	return Math.max(0, Math.floor((expiresAtMs - nowMs) / DAY_MS))
}

/** Where a whoami run reads from and prints to. */
export type WhoAmIDeps = {
	read: () => Credentials | null
	out: (line: string) => void
	log: (line: string) => void
}

/** Prints the account, issuer and days left; 1 when not signed in. No network. */
export function whoAmI(nowMs: number, deps: WhoAmIDeps): 0 | 1 {
	let credentials: Credentials | null
	try {
		credentials = deps.read()
	} catch (error) {
		deps.log(`whoami: ${errorMessage(error)}`)
		return 1
	}
	if (credentials === null) {
		deps.out("Not signed in.")
		return 1
	}
	deps.out(`Account id: ${credentials.accountId ?? "unknown"}`)
	deps.out(`Issuer: ${credentials.issuer}`)
	deps.out(`Sign in again within at most ${daysLeft(credentials.grantStartedAt, nowMs)} day(s)`)
	return 0
}

/** Runs `whoami` against the real credentials file. */
export function runWhoamiCommand(argv: readonly string[]): void {
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
	process.exitCode = whoAmI(Date.now(), {
		read: () => readCredentials(path, FILE_DEPS),
		out: (line) => console.log(line),
		log: (line) => console.error(line),
	})
}
