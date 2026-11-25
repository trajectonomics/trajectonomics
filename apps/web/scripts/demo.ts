#!/usr/bin/env bun
// Writes public/demo/snapshot.json, the Demo snapshot, from the fictional ledger. The file is generated
// and git-ignored, so it is compact JSON with no formatter step (ADR 0021). Two runs write the same
// bytes (cli ADR 0074), which `demo-regeneration.test.ts` checks.
import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { generateDemo } from "./demo-generate"
import { DEMO_SNAPSHOT_FILE } from "./demo-snapshot"

/** Builds the snapshot and returns the exit code. */
async function main(): Promise<number> {
	const run = await generateDemo()
	if (!run.ok) {
		process.stderr.write(`The demo could not be built: ${run.message}\n`)
		return 1
	}
	await mkdir(dirname(DEMO_SNAPSHOT_FILE), { recursive: true })
	await writeFile(DEMO_SNAPSHOT_FILE, run.text)
	process.stdout.write(`Wrote ${DEMO_SNAPSHOT_FILE} (${Buffer.byteLength(run.text)} bytes).\n`)
	return 0
}

process.exitCode = await main()
