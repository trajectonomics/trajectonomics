#!/usr/bin/env bun
// The entry point the Demo snapshot is generated with (cli ADR-0074). It is `index.ts` without the
// telemetry, and it honours TRAJ_FIXED_SOURCE: a fixed clock and a counted id source, so two
// generations write the same bytes. Nothing imports it and `build` does not compile it, so a shipped
// `traj` has no such variable.
import { writeSync } from "node:fs"
import { run } from "./cli"
import { FIXED_SOURCE_VARIABLE, parseFixedSource } from "./fixed-source"

function writeStderr(line: string): void {
	try {
		writeSync(2, `${line}\n`)
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code
		if (code !== "EPIPE" && code !== "EBADF") throw error
	}
}

const value = process.env[FIXED_SOURCE_VARIABLE]
const source = value === undefined ? undefined : parseFixedSource(value)
if (value !== undefined && source === undefined) {
	writeStderr(
		`${FIXED_SOURCE_VARIABLE} must be <instant>#<seed>, such as 2026-10-31T00:00:00.000Z#1000000.`,
	)
	process.exit(2)
}

process.exit(
	await run(
		Bun.argv.slice(2),
		{ out: (line) => console.log(line), err: writeStderr },
		process.env,
		undefined,
		undefined,
		source,
	),
)
