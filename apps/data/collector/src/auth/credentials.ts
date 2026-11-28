import { randomBytes } from "node:crypto"
import * as fs from "node:fs"
import { dirname, join } from "node:path"
import { keyModeError } from "../send/key"
import { type Credentials, parseCredentials } from "./credential-shape"

export type { Credentials } from "./credential-shape"

/** Injected file operations, so tests never touch a real credentials file. */
export type CredentialDeps = {
	modeOf: (path: string) => number
	readText: (path: string) => string
	exists: (path: string) => boolean
	mkdirPrivate: (path: string) => void
	writeExclusive: (path: string, text: string, mode: number) => void
	rename: (from: string, to: string) => void
	remove: (path: string) => void
}

/** Where login keeps the refresh token. */
export function credentialsPath(home: string): string {
	return join(home, ".config/traj-data/credentials.json")
}

/** The real filesystem; every write is owner-only and atomic. */
export const FILE_DEPS: CredentialDeps = {
	modeOf: (path) => fs.statSync(path).mode,
	readText: (path) => fs.readFileSync(path, "utf8"),
	exists: (path) => fs.existsSync(path),
	mkdirPrivate: (path) => fs.mkdirSync(path, { recursive: true, mode: 0o700 }),
	writeExclusive: (path, text, mode) => fs.writeFileSync(path, text, { mode, flag: "wx" }),
	rename: (from, to) => fs.renameSync(from, to),
	remove: (path) => fs.rmSync(path, { force: true }),
}

/** Reads the credentials file: null when absent, an error when unsafe or malformed. */
export function readCredentials(path: string, deps: CredentialDeps): Credentials | null {
	if (!deps.exists(path)) return null
	let mode: number
	try {
		mode = deps.modeOf(path)
	} catch {
		throw new Error(`credentials file ${path} cannot be read`)
	}
	const problem = keyModeError(mode)
	if (problem !== null) {
		throw new Error(`credentials file ${path} ${problem}; run: chmod 600 ${path}`)
	}
	let body: unknown
	try {
		body = JSON.parse(deps.readText(path))
	} catch {
		throw new Error(`credentials file ${path} is not valid JSON`)
	}
	const credentials = parseCredentials(body)
	if (credentials === null) throw new Error(`credentials file ${path} is malformed`)
	return credentials
}

/** Writes the credentials through a mode-600 temporary file and one rename. */
export function writeCredentials(
	path: string,
	credentials: Credentials,
	deps: CredentialDeps,
): void {
	deps.mkdirPrivate(dirname(path))
	const temporary = `${path}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`
	deps.writeExclusive(temporary, `${JSON.stringify(credentials, null, 2)}\n`, 0o600)
	try {
		deps.rename(temporary, path)
	} catch (error) {
		try {
			deps.remove(temporary)
		} catch {
			// Best effort; report the rename error.
		}
		throw error
	}
}

export function deleteCredentials(path: string, deps: CredentialDeps): void {
	deps.remove(path)
}
