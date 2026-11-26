import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { snapshot } from "../src/lib/contract"
import { readsOf } from "../src/lib/snapshot"
import { type DemoRun, runDemo } from "./demo-run"
import { demoSnapshotJson } from "./demo-snapshot"

/** The workspace's own traj binary, built by `turbo run build --filter=@trajectonomics/cli`. */
const BINARY = fileURLToPath(new URL("../../cli/dist/traj", import.meta.url))
/**
 * A fresh ledger, built and read against the real CLI, takes about 75 s on an idle 4-core machine with
 * the Demo's chance read and Milestones (#264 tracks the slowdown), so the limit leaves room for a
 * slower runner.
 */
const SLOW_MS = 180_000

/** One demo run shared by the tests that need it, so the ledger is built once. */
let demo: Promise<DemoRun> | null = null
function demoRun(): Promise<DemoRun> {
	demo ??= runDemo(BINARY)
	return demo
}

describe("the Snapshot against the real traj", () => {
	test("the workspace traj binary is built", () => {
		expect(existsSync(BINARY)).toBe(true)
	})

	test(
		"every read of a fresh demo ledger is ok but a refused tax-notes dry run, and the whole document parses",
		async () => {
			const run = await demoRun()
			if (!run.ok) throw new Error(`the demo did not run: ${run.message}`)
			const failed = readsOf(run.snapshot).filter((read) => !read.ok)
			// `base` gained an income Flow without a tax label after its Levy was written, so the CLI refuses
			// `--from-stored`; the read keeps the refusal, and the tax page shows no note for it.
			const notes = failed.filter((read) => read.argv[0] === "scenario" && read.argv[1] === "tax")
			expect(notes).toHaveLength(1)
			if (notes[0]?.ok === false) expect(notes[0].error.code).toBe("invalid_input")
			expect(failed.filter((read) => !notes.includes(read))).toEqual([])
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

	test("the generated Demo snapshot parses with the Snapshot schema", async () => {
		const demo = await demoSnapshotJson()
		expect(snapshot.safeParse(demo).success).toBe(true)
	})
})
