import { randomBytes } from "node:crypto"
import { dirname, join } from "node:path"
import { errorCode, errorMessage } from "../message"
import { keyModeError } from "../send/key"
import { type Credentials, parseCredentials } from "./credential-shape"

export type { Credentials } from "./credential-shape"

/** The file facts reading needs; `lstat` never follows a symlink. */
export type CredentialStat = { isFile: boolean; isSymbolicLink: boolean; mode: number }

/** Injected file operations, so tests never touch a real credentials file. */
export type CredentialDeps = {
	lstat: (path: string) => CredentialStat
	readText: (path: string) => string
	mkdirPrivate: (path: string) => void
	writeExclusive: (path: string, text: string, mode: number) => void
	rename: (from: string, to: string) => void
	syncDir: (path: string) => void
	remove: (path: string) => void
}

/** Where login keeps the refresh token. */
export function credentialsPath(home: string): string {
	return join(home, ".config/traj-data/credentials.json")
}

/** Reads the credentials file: null when absent, an error when unsafe or malformed. */
export function readCredentials(path: string, deps: CredentialDeps): Credentials | null {
	let stat: CredentialStat
	try {
		stat = deps.lstat(path)
	} catch (error) {
		if (errorCode(error) === "ENOENT") return null
		throw new Error(`credentials file ${path} cannot be read: ${errorMessage(error)}`)
	}
	if (stat.isSymbolicLink || !stat.isFile) {
		throw new Error(`credentials file ${path} must be a regular file`)
	}
	const problem = keyModeError(stat.mode)
	if (problem !== null) {
		throw new Error(`credentials file ${path} ${problem}; run: chmod 600 ${path}`)
	}
	let text: string
	try {
		text = deps.readText(path)
	} catch (error) {
		throw new Error(`credentials file ${path} cannot be read: ${errorMessage(error)}`)
	}
	let body: unknown
	try {
		body = JSON.parse(text)
	} catch {
		throw new Error(`credentials file ${path} is not valid JSON`)
	}
	const credentials = parseCredentials(body)
	if (credentials === null) throw new Error(`credentials file ${path} is malformed`)
	return credentials
}

/** Writes the credentials through a mode-600 temporary file, one rename and a directory sync. */
export function writeCredentials(
	path: string,
	credentials: Credentials,
	deps: CredentialDeps,
): void {
	deps.mkdirPrivate(dirname(path))
	const temporary = `${path}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`
	try {
		deps.writeExclusive(temporary, `${JSON.stringify(credentials, null, 2)}\n`, 0o600)
		deps.rename(temporary, path)
		deps.syncDir(dirname(path))
	} catch (error) {
		try {
			deps.remove(temporary)
		} catch {
			// Best effort; report the write error.
		}
		throw error
	}
}

/** Deletes the stored credentials file; a missing file is not an error. */
export function deleteCredentials(path: string, deps: CredentialDeps): void {
	deps.remove(path)
}
