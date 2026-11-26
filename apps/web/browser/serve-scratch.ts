// Serves an editable Dashboard over a scratch fictional ledger for the browser checks that write: the Demo's Scenarios are
// built with the command line's source, and the built pages and their Snapshot are served on loopback (scripts/serve.ts).
// TRAJ_HOME is the scratch directory, never the owner's ledger, and it goes on exit or a signal.
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { demoSeparateCarryIn } from "../scripts/demo/carry-in"
import { buildDemoLedger } from "../scripts/demo-ledger"
import { makeScratch } from "../scripts/scratch"
import { startDashboard } from "../scripts/serve"
import { spawnCapture } from "../scripts/spawn"
import type { PlanParams } from "../src/lib/snapshot"
import { SCRATCH_ORIGIN, SCRATCH_PORT } from "./base-url"

const CLI = fileURLToPath(new URL("../../cli/src/index.ts", import.meta.url))
// One plan per width, so two browser checks write without racing over the same stored profile.
const PLANS = ["shared-360", "shared-1280"] as const

/** The plans the write checks open: the Demo's separate-filing couple, with the carry-in its Levies need. */
const PARAMS: PlanParams = {
	asOf: "2026-10-31",
	horizon: "2053-12-31",
	scenarios: [...PLANS],
	compare: null,
	birthDate: null,
	ages: [],
	monthly: false,
	carryIn: true,
	chance: null,
	allowances: null,
	futures: false,
	readPaths: false,
}

const scratch = await makeScratch("traj-web-browser-")
const home = join(scratch, "traj-home")
const traj = join(scratch, "traj")
// `buildDemoLedger` runs one binary, so this wrapper is the command line's source behind the same argv.
await writeFile(traj, `#!/bin/sh\nexec "${process.execPath}" "${CLI}" "$@"\n`, { mode: 0o755 })
await buildDemoLedger({ binary: traj, home, scratch })

const env = { ...process.env, TRAJ_HOME: home, DO_NOT_TRACK: "1" }
for (const name of PLANS) {
	const made = await spawnCapture([traj, "scenario", "fork", "separate", name, "--json"], { env })
	if (made.code !== 0) {
		console.error(`The scratch Dashboard could not fork ${name}: ${made.stderr.trim()}`)
		process.exit(1)
	}
}
const records = PLANS.flatMap((scenario) =>
	demoSeparateCarryIn().map((record) => ({ ...(record as Record<string, unknown>), scenario })),
)

const running = await startDashboard({
	traj: { binary: traj, env },
	cliVersion: "browser",
	params: PARAMS,
	records,
	port: SCRATCH_PORT,
})
if (!running.ok) {
	console.error(`The scratch Dashboard did not start: ${running.error.message}`)
	process.exit(1)
}
console.log(`The scratch Dashboard is at ${SCRATCH_ORIGIN}.`)
