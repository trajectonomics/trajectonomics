import { homedir } from "node:os"
import { readTextFile } from "../quota/credentials"
import { sampleQuota } from "../quota/sample"
import { fail } from "./errors"

const USAGE = "Usage: bun src/cli.ts quota"

/** Samples both plans and prints quota rows as JSON lines. */
export async function runQuotaCommand(argv: readonly string[]): Promise<void> {
	for (const arg of argv) {
		if (arg === "--help" || arg === "-h") {
			console.log(USAGE)
			return
		}
		fail(`Unknown argument: ${arg}`, USAGE)
	}
	const rows = await sampleQuota({
		home: homedir(),
		nowMs: Date.now(),
		fetch,
		readText: readTextFile,
		log: (line) => console.error(line),
	})
	for (const row of rows) console.log(JSON.stringify({ kind: "quota", ...row }))
}
