import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { cursorPath } from "./cursor"

/** Reads one host's cursor; a missing or unreadable file means no cursor. */
export function readCursor(stateDir: string, name: string): string | null {
	try {
		const text = readFileSync(cursorPath(stateDir, name), "utf8").trim()
		return text.length === 0 ? null : text
	} catch {
		return null
	}
}

/** Writes one host's cursor through a mode-600 temporary file and one rename. */
export function writeCursor(stateDir: string, name: string, iso: string): void {
	mkdirSync(stateDir, { recursive: true })
	const path = cursorPath(stateDir, name)
	const temporary = `${path}.${process.pid}.tmp`
	writeFileSync(temporary, `${iso}\n`, { mode: 0o600 })
	renameSync(temporary, path)
}
