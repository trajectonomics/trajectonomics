import { homedir } from "node:os"
import { authIssuer, trimIssuer } from "../auth/config"
import { credentialsPath, FILE_DEPS, writeCredentials } from "../auth/credentials"
import { login } from "../auth/login"
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
		issuer = trimIssuer(value)
		i += 1
	}
	return { issuer }
}

/** Runs `login` with the real clock, network and credentials file. */
export async function runLoginCommand(argv: readonly string[]): Promise<void> {
	const { issuer } = parseLoginArgs(argv, process.env)
	const outcome = await login(issuer, {
		fetch: (url, init) => fetch(url, init),
		sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
		nowMs: () => Date.now(),
		save: (credentials) => writeCredentials(credentialsPath(homedir()), credentials, FILE_DEPS),
		log: (line) => console.error(line),
		out: (line) => console.log(line),
	})
	if (outcome.ok) return
	console.error(`login: ${outcome.message}`)
	process.exitCode = 1
}
