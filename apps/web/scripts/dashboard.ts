#!/usr/bin/env bun
// Builds the pages, writes the Snapshot of your own ledger into dist/, and previews on 127.0.0.1.
const SNAPSHOT = "dist/snapshot.json"

/** Runs a command with the terminal's streams, and returns its exit code. */
function inherit(argv: string[]): Promise<number> {
	return Bun.spawn(argv, { stdin: "inherit", stdout: "inherit", stderr: "inherit" }).exited
}

/** Builds, writes the Snapshot from the flags, and previews. Returns the exit code of the first failure. */
export async function main(flags: readonly string[]): Promise<number> {
	const build = await inherit(["bunx", "vite", "build"])
	if (build !== 0) return build
	const snapshot = await inherit([
		process.execPath,
		"scripts/snapshot.ts",
		...flags,
		"--out",
		SNAPSHOT,
	])
	if (snapshot !== 0) return snapshot
	process.stdout.write(
		`The Snapshot is in ${SNAPSHOT}. Serving the Dashboard on http://127.0.0.1:4321 .\n`,
	)
	return inherit(["bunx", "vite", "preview", "--host", "127.0.0.1"])
}

if (import.meta.main) {
	process.exit(await main(process.argv.slice(2)))
}
