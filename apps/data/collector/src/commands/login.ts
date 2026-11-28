import { homedir } from "node:os"
import { authIssuer, requireSecureIssuer, trimIssuer } from "../auth/config"
import { FILE_DEPS } from "../auth/credential-fs"
import { credentialsPath, readCredentials, writeCredentials } from "../auth/credentials"
import { type LoginDeps, type LoginOutcome, login as runDeviceLogin } from "../auth/login"
import { errorMessage } from "../message"
import { realSleep } from "../sleep"
import { fail } from "./errors"

const USAGE = "Usage: bun src/cli.ts login [--issuer <url>]"

/** Parsed `login` arguments. */
export type LoginArgs = { issuer: string }

/** Parses `login` arguments; `--issuer` overrides `TRAJ_AUTH_URL` and the default. */
export function parseLoginArgs(
	argv: readonly string[],
	env: Record<string, string | undefined>,
): LoginArgs {
	let issuer = authIssuer(env)
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i] ?? ""
		if (arg === "--help" || arg === "-h") {
			console.log(USAGE)
			process.exit(0)
		}
		if (arg !== "--issuer") fail(`Unknown argument: ${arg}`, USAGE)
		const value = argv[i + 1]
		if (value === undefined) fail("--issuer needs a value", USAGE)
		issuer = requireSecureIssuer(trimIssuer(value))
		i += 1
	}
	return { issuer }
}

/** The I/O one login run touches, injected so tests never poll or write the owner's file. */
export type LoginCommandDeps = {
	env: Record<string, string | undefined>
	login: (issuer: string) => Promise<LoginOutcome>
	log: (line: string) => void
	exit: (code: 0 | 1) => void
}

/** Runs `login` with the real clock, network and credentials file. */
export async function runLoginCommand(
	argv: readonly string[],
	deps: LoginCommandDeps = realLoginCommandDeps(),
): Promise<void> {
	let issuer: string
	try {
		issuer = parseLoginArgs(argv, deps.env).issuer
	} catch (error) {
		deps.log(`login: ${errorMessage(error)}`)
		deps.exit(1)
		return
	}
	let outcome: LoginOutcome
	try {
		outcome = await deps.login(issuer)
	} catch (error) {
		deps.log(`login: could not save credentials: ${errorMessage(error)}`)
		deps.exit(1)
		return
	}
	if (outcome.ok) return
	deps.log(`login: ${outcome.message}`)
	deps.exit(1)
}

function realLoginCommandDeps(): LoginCommandDeps {
	const log = (line: string): void => console.error(line)
	const out = (line: string): void => console.log(line)
	const loginDeps = (): LoginDeps => ({
		fetch: (url, init) => fetch(url, init),
		sleep: realSleep,
		nowMs: () => Date.now(),
		save: (credentials) => {
			writeCredentials(credentialsPath(homedir()), credentials, FILE_DEPS)
		},
		read: () => readCredentials(credentialsPath(homedir()), FILE_DEPS),
		log,
		out,
	})
	return {
		env: process.env,
		login: (issuer) => runDeviceLogin(issuer, loginDeps()),
		log,
		exit: (code) => {
			process.exitCode = code
		},
	}
}
