import { readFileSync, statSync } from "node:fs"

/** A file-mode problem for the key, or null when only its owner can access it. */
export function keyModeError(mode: number): string | null {
	if ((mode & 0o077) === 0) return null
	return "is accessible by group or others"
}

/** Injected file operations, so tests never touch a real key file. */
export type KeyDeps = {
	modeOf: (path: string) => number
	readText: (path: string) => string
}

const FILE_DEPS: KeyDeps = {
	modeOf: (path) => statSync(path).mode,
	readText: (path) => readFileSync(path, "utf8"),
}

/** Reads the ingest key, refusing any file that group or others can access. */
export function readIngestKey(path: string, deps: KeyDeps = FILE_DEPS): string {
	let mode: number
	try {
		mode = deps.modeOf(path)
	} catch {
		throw new Error(`ingest key file ${path} cannot be read`)
	}
	const problem = keyModeError(mode)
	if (problem !== null) {
		throw new Error(`ingest key file ${path} ${problem}; run: chmod 600 ${path}`)
	}
	const key = deps.readText(path).trim()
	if (key.length === 0) throw new Error(`ingest key file ${path} is empty`)
	return key
}
