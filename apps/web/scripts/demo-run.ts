import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Snapshot } from "../src/lib/contract"
import { checkParams, type PlanInput } from "../src/lib/snapshot"
import { redactDirectory } from "../src/lib/snapshot/redact"
import { demoCarryIn } from "./demo/carry-in"
import { buildDemoLedger } from "./demo-ledger"
import { runSnapshot } from "./snapshot-run"
import { checkBinary } from "./traj-binary"

/** The demo's parameters: fixed dates, so the committed Demo snapshot is reproducible. */
export const DEMO_INPUT: PlanInput = {
	asOf: "2026-10-31",
	horizon: "2060-12-31",
	scenarios: [],
	compare: { a: "base", b: "retire-early" },
	birthDate: "1990-05-15",
	ages: [45, 55, 60],
	monthly: false,
	carryIn: true,
}

/** The demo's Scenarios, in the order their Carry-in records name them. */
const DEMO_SCENARIOS = ["base", "retire-early"]

/** The stand-in for the scratch data directory in the committed Snapshot. */
export const HOME_STAND_IN = "~/.traj"

export type DemoRun =
	| { ok: true; snapshot: Snapshot; text: string }
	| { ok: false; message: string }

/**
 * Builds the fictional ledger in a scratch directory, runs the Plan over it, and returns the Snapshot
 * with the scratch path replaced by `~/.traj`. The scratch directory is removed afterwards.
 */
export async function runDemo(binary: string): Promise<DemoRun> {
	const scratch = await mkdtemp(join(tmpdir(), "traj-web-demo-"))
	try {
		const home = join(scratch, "traj-home")
		await buildDemoLedger({ binary, home, scratch })
		const check = await checkBinary(binary, process.env)
		if (!check.ok) return { ok: false, message: check.message }
		const params = checkParams(DEMO_INPUT)
		if (!params.ok) return { ok: false, message: params.error.message }
		const env = { ...process.env, TRAJ_HOME: home }
		const run = await runSnapshot(
			{ binary, env },
			check.version,
			params.params,
			demoCarryIn(DEMO_SCENARIOS),
		)
		if (!run.ok) return { ok: false, message: run.error.message }
		const json = JSON.stringify(run.snapshot, null, "\t")
		return {
			ok: true,
			snapshot: run.snapshot,
			text: `${redactDirectory(json, home, HOME_STAND_IN)}\n`,
		}
	} finally {
		await rm(scratch, { recursive: true, force: true })
	}
}
