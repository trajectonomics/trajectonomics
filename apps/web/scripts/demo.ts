#!/usr/bin/env bun
// Writes public/demo/snapshot.json, the Demo snapshot, from the fictional ledger. The file is generated
// and git-ignored, so it is compact JSON with no formatter step (ADR 0021).
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { runDemo } from "./demo-run"
import { DEMO_SNAPSHOT_FILE } from "./demo-snapshot"
import { spawnCapture } from "./spawn"

const CLI_ROOT = fileURLToPath(new URL("../../cli", import.meta.url))

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

const scratch = await mkdtemp(join(tmpdir(), "traj-web-demo-bin-"))
try {
	const binary = join(scratch, "traj")
	const failure = await compileTraj(binary)
	if (failure !== null) {
		process.stderr.write(`traj could not be compiled for the demo:\n${failure}`)
		process.exit(1)
	}
	const run = await runDemo(binary)
	if (!run.ok) {
		process.stderr.write(`The demo could not be built: ${run.message}\n`)
		process.exit(1)
	}
	await mkdir(dirname(DEMO_SNAPSHOT_FILE), { recursive: true })
	await writeFile(DEMO_SNAPSHOT_FILE, run.text)
	process.stdout.write(`Wrote ${DEMO_SNAPSHOT_FILE} (${Buffer.byteLength(run.text)} bytes).\n`)
} finally {
	await rm(scratch, { recursive: true, force: true })
}
