#!/usr/bin/env bun
// Writes public/demo/snapshot.json, the Demo snapshot, from the fictional ledger. The file is generated
// and git-ignored, so it is compact JSON with no formatter step (ADR 0021).
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { runDemo } from "./demo-run"
import { DEMO_SNAPSHOT_FILE } from "./demo-snapshot"
import { spawnCapture } from "./spawn"

const CLI_ROOT = fileURLToPath(new URL("../../cli", import.meta.url))
// The compiled binary is about 110 MB. It goes under node_modules (git-ignored, on the workspace's disk),
// never under os.tmpdir(), which is the small shared tmpfs of AGENTS.md rule 8.
const SCRATCH_ROOT = fileURLToPath(new URL("../node_modules/.cache", import.meta.url))

/**
 * Compiles the CLI's source into `outfile`, the way `apps/cli`'s `build` does. The compile finds no
 * `pack/dashboard.bin`, which `traj dashboard` needs and the Demo does not: the CLI embeds the Pack and
 * the Pack holds this file, so waiting for `@trajectonomics/cli#build` would be a cycle (ADR 0021).
 */
async function compileTraj(outfile: string): Promise<string | null> {
	const build = await spawnCapture(
		[
			process.execPath,
			"build",
			"src/index.ts",
			"--compile",
			"--no-compile-autoload-bunfig",
			"--no-compile-autoload-dotenv",
			"--outfile",
			outfile,
		],
		{ cwd: CLI_ROOT },
	)
	return build.code === 0 ? null : build.stdout + build.stderr
}

/** Builds the snapshot and returns the exit code. It returns rather than exiting, so the cleanup always runs. */
async function main(): Promise<number> {
	await mkdir(SCRATCH_ROOT, { recursive: true })
	const scratch = await mkdtemp(join(SCRATCH_ROOT, "traj-demo-"))
	try {
		const binary = join(scratch, "traj")
		const failure = await compileTraj(binary)
		if (failure !== null) {
			process.stderr.write(`traj could not be compiled for the demo:\n${failure}`)
			return 1
		}
		const run = await runDemo(binary)
		if (!run.ok) {
			process.stderr.write(`The demo could not be built: ${run.message}\n`)
			return 1
		}
		await mkdir(dirname(DEMO_SNAPSHOT_FILE), { recursive: true })
		await writeFile(DEMO_SNAPSHOT_FILE, run.text)
		process.stdout.write(`Wrote ${DEMO_SNAPSHOT_FILE} (${Buffer.byteLength(run.text)} bytes).\n`)
		return 0
	} finally {
		await rm(scratch, { recursive: true, force: true })
	}
}

process.exitCode = await main()
