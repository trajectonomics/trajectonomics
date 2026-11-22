import { readFile } from "node:fs/promises"

/** The records of a Carry-in file: a JSON array, one record per Scenario, Levy and period. */
export type CarryInFile = { ok: true; records: unknown[] } | { ok: false; message: string }

/** Reads a Carry-in file. Its records are checked by the CLI, which names the record it refuses. */
export async function readCarryInFile(path: string): Promise<CarryInFile> {
	let text: string
	try {
		text = await readFile(path, "utf8")
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error)
		return { ok: false, message: `--carry-in could not read ${path}: ${reason}` }
	}
	try {
		const parsed: unknown = JSON.parse(text)
		if (Array.isArray(parsed)) return { ok: true, records: parsed }
		return { ok: false, message: `--carry-in ${path} must hold a JSON array of records.` }
	} catch {
		return { ok: false, message: `--carry-in ${path} is not JSON.` }
	}
}
