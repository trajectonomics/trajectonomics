#!/usr/bin/env bun
import pkg from "../package.json"
import { run } from "./cli"
import type { RunRecord } from "./telemetry/event"
import { afterRun, postEvent } from "./telemetry/send"
import { EVENT_VARIABLE, spawnSender } from "./telemetry/spawn"
import { readState, writeState } from "./telemetry/state"

// A detached telemetry child: post the one event it was given and exit, without running a command.
const pending = process.env[EVENT_VARIABLE]
if (pending !== undefined) {
	await postEvent(pending)
	process.exit(0)
}

let record: RunRecord | undefined
const code = await run(
	Bun.argv.slice(2),
	{
		out: (line) => console.log(line),
		err: (line) => console.error(line),
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
		writeState: (state) => {
			writeState(process.env, state)
		},
		spawnSender,
		notice: (line) => console.error(line),
	})
}

process.exit(code)
