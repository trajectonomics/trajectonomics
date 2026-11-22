import { mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import {
	type ListedSkill,
	matchesVerdict,
	pickedSkill,
	readListedSkills,
	readTriggerQueries,
	type TriggerQuery,
	triggerPrompt,
} from "./trigger-queries"

/**
 * Measure the trigger surface: for each of the twenty fixed queries, ask a model which Skill it would
 * load given exactly the five names and descriptions. It calls a model, one call at a time, so it is
 * never part of `bun run check`. Usage: `bun scripts/measure-triggers.ts [--runs 3] [--model <id>]`.
 */
const args = process.argv.slice(2)
const flag = (name: string, fallback: string) => args[args.indexOf(name) + 1] ?? fallback
const RUNS = Number(flag("--runs", "3"))
const MODEL = flag("--model", "claude-haiku-5-5")

/** One headless model call from an empty directory, with no tools, skills or settings of its own. */
function ask(prompt: string, cwd: string): string {
	const run = Bun.spawnSync(
		["claude", "-p", "--model", MODEL, "--tools", "", "--disable-slash-commands"].concat([
			"--no-session-persistence",
			"--setting-sources",
			"",
			"--strict-mcp-config",
			prompt,
		]),
		{ cwd },
	)
	if (run.exitCode !== 0) throw new Error(`claude exited ${run.exitCode}: ${run.stderr}`)
	return run.stdout.toString()
}

function measure(query: TriggerQuery, skills: ListedSkill[], cwd: string): string[] {
	return Array.from({ length: RUNS }, () =>
		pickedSkill(ask(triggerPrompt(skills, query.q), cwd), skills),
	)
}

function report(query: TriggerQuery, picks: string[]): number {
	const matched = picks.filter((pick) => matchesVerdict(query, pick)).length
	const note = query.unclaimed ? " (unclaimed)" : ""
	console.log(
		`${matched}/${RUNS}  ${query.expect.padEnd(7)} ${query.q}${note}\n        -> ${picks.join(", ")}`,
	)
	return matched
}

mkdirSync(join(homedir(), ".cache"), { recursive: true })
const scratch = mkdtempSync(join(homedir(), ".cache", "measure-triggers-"))
try {
	const skills = readListedSkills()
	let total = 0
	let claimed = 0
	const queries = readTriggerQueries()
	for (const query of queries) {
		const matched = report(query, measure(query, skills, scratch))
		total += matched
		if (!query.unclaimed) claimed += matched
	}
	const size = queries.length * RUNS
	console.log(
		`\nmodel ${MODEL}: ${total}/${size} runs match (${claimed}/${size - RUNS} excluding the unclaimed removal query)`,
	)
} finally {
	rmSync(scratch, { recursive: true, force: true })
}
