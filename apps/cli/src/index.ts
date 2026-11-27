#!/usr/bin/env bun
import { writeSync } from "node:fs"
import pkg from "../package.json"
import { run } from "./cli"
import { telemetryDecision } from "./telemetry/decide"
import type { RunRecord } from "./telemetry/event"
import { isUsageBody, postEvent } from "./telemetry/post"
import { afterRun } from "./telemetry/send"
import { EVENT_VARIABLE, spawnSender } from "./telemetry/spawn"
import { readState, writeState } from "./telemetry/state"

// A detached telemetry child: post the one event it was given and exit, without running a command.
// A value this CLI did not make is ignored and the command runs as usual, and the child checks the
// environment's opt-outs again, so a stray export can never turn a command into a silent no-op.
const pending = process.env[EVENT_VARIABLE]
if (pending !== undefined && isUsageBody(pending)) {
	const decision = telemetryDecision({
		env: process.env,
		state: { enabled: true },
		version: pkg.version,
	})
	if (decision.enabled) await postEvent(pending)
	process.exit(0)
}

function writeStderr(line: string): void {
	try {
		writeSync(2, `${line}\n`)
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code
		if (code !== "EPIPE" && code !== "EBADF") throw error
	}
}

let record: RunRecord | undefined
const code = await run(
	Bun.argv.slice(2),
	{
		out: (line) => console.log(line),
		err: writeStderr,
		observe: (observed) => {
			record = observed
		},
	},
	process.env,
)

if (record !== undefined) {
	afterRun({
		record,
		env: process.env,
		version: pkg.version,
		platform: process.platform,
		arch: process.arch,
		now: () => new Date().toISOString(),
		newUuid: () => crypto.randomUUID(),
		readState: () => readState(process.env),
		writeState: (state) => writeState(process.env, state) === undefined,
		spawnSender,
		notice: writeStderr,
	})
}

process.exit(code)
