import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { type Read, type Snapshot, snapshot } from "../src/lib/contract"
import { type DemoRun, runDemo } from "./demo-run"

/** The workspace's own traj binary, built by `turbo run build --filter=@trajectonomics/cli`. */
const BINARY = fileURLToPath(new URL("../../cli/dist/traj", import.meta.url))
const COMMITTED = fileURLToPath(new URL("../public/demo/snapshot.json", import.meta.url))
/** A fresh ledger, built and read against the real CLI, takes a little over ten seconds. */
const SLOW_MS = 120_000

/** One demo run shared by the tests that need it, so the ledger is built once. */
let demo: Promise<DemoRun> | null = null
function demoRun(): Promise<DemoRun> {
	demo ??= runDemo(BINARY)
	return demo
}

/** Every Read a Snapshot holds, whatever its slot. */
function readsOf(document: Snapshot): Read<unknown>[] {
	const { reads } = document
	const single = [
		reads.doctor,
		reads.accounts,
		reads.balance,
		reads.netWorth,
		reads.pnl,
		reads.transactions,
		reads.baseline,
		reads.scenarios,
	]
	const maps = [...Object.values(reads.projections), ...Object.values(reads.fi)]
	const compare = reads.compare === null ? [] : [reads.compare]
	return [...single, ...reads.netWorthHistory, ...maps, ...compare]
}

describe("the Snapshot against the real traj", () => {
	test("the workspace traj binary is built", () => {
		expect(existsSync(BINARY)).toBe(true)
	})

	test(
		"every read of a fresh demo ledger is ok, and the whole document parses",
		async () => {
			const run = await demoRun()
			if (!run.ok) throw new Error(`the demo did not run: ${run.message}`)
			const failed = readsOf(run.snapshot)
				.filter((read) => !read.ok)
				.map((read) => `${read.argv.join(" ")}: ${read.ok ? "" : read.error.message}`)
			expect(failed).toEqual([])
			expect(snapshot.safeParse(run.snapshot).success).toBe(true)
		},
		SLOW_MS,
	)

	test(
		"the Thai Levy fills taxYears, so the projection and the fi read carry tax",
		async () => {
			const run = await demoRun()
			if (!run.ok) throw new Error(`the demo did not run: ${run.message}`)
			const base = run.snapshot.reads.projections["base"]
			expect(base?.ok).toBe(true)
			if (base?.ok) expect(base.data.taxYears.length).toBeGreaterThan(0)
		},
		SLOW_MS,
	)

	test("the committed Demo snapshot parses with the Snapshot schema", async () => {
		const committed: unknown = JSON.parse(await readFile(COMMITTED, "utf8"))
		expect(snapshot.safeParse(committed).success).toBe(true)
	})
})
