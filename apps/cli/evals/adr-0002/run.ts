import { mkdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { AGENT_BINARY, AGENTS } from "./agents"
import { type Options, parseOptions, printPlan, selectPersonas } from "./cli"
import { loadPersonas } from "./persona"
import { runPersona } from "./persona-run"
import { referenceOf, resolveRelease } from "./release"
import { type RunRow, renderReport } from "./report"

const RUNS_ROOT = join(homedir(), ".cache", "eval-harness", "runs")
const PERSONAS_DIR = join(import.meta.dir, "personas")
const RESULTS_DIR = join(import.meta.dir, "results")

/** Runs the eval and returns the process exit code: 0 for a run or a skip, 2 for bad usage. */
export async function main(argv: readonly string[]): Promise<number> {
	let options: Options
	try {
		options = parseOptions(argv)
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
		process.stderr.write(
			`usage: bun run eval -- --agent <${AGENTS.join("|")}> [--persona <id>] [--release <v>]\n`,
		)
		return 2
	}
	const bin = Bun.which(AGENT_BINARY[options.agent])
	if (bin === null && !options.dryRun) {
		process.stdout.write(
			`skipped: \`${AGENT_BINARY[options.agent]}\` is not on PATH, so the ${options.agent} eval did not run. Install it and run again.\n`,
		)
		return 0
	}
	const personas = selectPersonas(loadPersonas(PERSONAS_DIR), options.personas)
	const released = await resolveRelease(options)
	const runRoot = join(RUNS_ROOT, new Date().toISOString().replace(/[:.]/g, "-"))
	if (options.dryRun) {
		printPlan(released, options.agent, personas, runRoot)
		return 0
	}
	const refHome = join(runRoot, "reference-home")
	mkdirSync(refHome, { recursive: true })
	const reference = await referenceOf(released.argv, refHome)
	const rows: RunRow[] = []
	for (const persona of personas) {
		rows.push(
			await runPersona({
				persona,
				agent: options.agent,
				bin: bin ?? "",
				released,
				reference,
				runRoot,
				timeoutMs: options.timeoutMs,
			}),
		)
	}
	mkdirSync(RESULTS_DIR, { recursive: true })
	const out = join(RESULTS_DIR, `${released.label}-${options.agent}.md`)
	writeFileSync(
		out,
		renderReport({
			release: released.label,
			agent: options.agent,
			date: new Date().toISOString(),
			runRoot: runRoot.replace(homedir(), "~"),
			rows,
		}),
	)
	process.stdout.write(`wrote ${out}\nraw run files: ${runRoot}\n`)
	return 0
}

if (import.meta.main) {
	process.exitCode = await main(process.argv.slice(2))
}
