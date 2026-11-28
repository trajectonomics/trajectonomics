// `assumed` against the real traj: the contract reads what a plan written from the template lists (cli ADR-0084).
import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { scenarioShow } from "../src/lib/contract"
import { copyDemoLedger } from "./demo-ledger.test-support"
import { runTraj } from "./run-traj"
import { makeScratch, removeScratch } from "./scratch"
import { spawnCapture } from "./spawn"

/** The workspace's own traj binary, built by `turbo run build --filter=@trajectonomics/cli`. */
const BINARY = fileURLToPath(new URL("../../cli/dist/traj", import.meta.url))
/** A fresh ledger takes over a minute to build on a slower runner. */
const SLOW_MS = 180_000

describe("what a plan assumes, against the real traj", () => {
	test(
		"a plan written from the template lists the values traj wrote as template-default",
		async () => {
			const scratch = await makeScratch("traj-web-assumed-")
			try {
				const home = join(scratch, "traj-home")
				await copyDemoLedger({ binary: BINARY, home, scratch })
				const env = { ...process.env, TRAJ_HOME: home, DO_NOT_TRACK: "1" }
				const write = ["scenario", "apply", "fresh", "--template", "--as-of", "2026-10-31"]
				const made = await spawnCapture([BINARY, ...write, "--json"], { env })
				expect(made.code).toBe(0)
				const shown = await runTraj(
					{ binary: BINARY, env },
					["scenario", "show", "fresh", "--decimal", "--json"],
					scenarioShow,
				)
				if (!shown.ok) throw new Error(shown.error.message)
				const listed = shown.data.scenario.assumed ?? []
				expect(listed.map((item) => [item.kind, item.path])).toContainEqual([
					"template-default",
					"economy.inflation",
				])
			} finally {
				await removeScratch(scratch)
			}
		},
		SLOW_MS,
	)
})
