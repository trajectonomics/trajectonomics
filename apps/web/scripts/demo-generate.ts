import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { type DemoRun, runDemo } from "./demo-run"
import { spawnCapture } from "./spawn"

const CLI_ROOT = fileURLToPath(new URL("../../cli", import.meta.url))
// The compiled binary is about 110 MB. It goes under node_modules (git-ignored, on the workspace's disk),
// never under os.tmpdir(), which is the small shared tmpfs of AGENTS.md rule 8.
const SCRATCH_ROOT = fileURLToPath(new URL("../node_modules/.cache", import.meta.url))

/**
 * Compiles the CLI's demo entry point into `outfile`, the way `apps/cli`'s `build` compiles `index.ts`.
 * The entry point is `index.ts` without the telemetry and with the fixed clock and id source, which
 * the Demo needs so that two generations write the same bytes and which a shipped `traj` never has
 * (cli ADR 0074). The compile finds no `pack/dashboard.bin`, which `traj dashboard` needs and the Demo
 * does not: the CLI embeds the Pack and the Pack holds the Demo snapshot, so waiting for
 * `@trajectonomics/cli#build` would be a cycle (ADR 0021).
 */
async function compileDemoTraj(outfile: string): Promise<string | null> {
	const build = await spawnCapture(
		[
			process.execPath,
			"build",
			"src/demo-entry.ts",
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

/**
 * Compiles a fresh demo `traj`, generates the Demo snapshot with it, and removes the binary. It
 * returns rather than throws, so the caller decides the exit code, and it cleans up either way.
 */
export async function generateDemo(): Promise<DemoRun> {
	await mkdir(SCRATCH_ROOT, { recursive: true })
	const scratch = await mkdtemp(join(SCRATCH_ROOT, "traj-demo-"))
	try {
		const binary = join(scratch, "traj")
		const failure = await compileDemoTraj(binary)
		if (failure !== null) {
			return { ok: false, message: `traj could not be compiled for the demo:\n${failure}` }
		}
		return await runDemo(binary)
	} finally {
		await rm(scratch, { recursive: true, force: true })
	}
}
