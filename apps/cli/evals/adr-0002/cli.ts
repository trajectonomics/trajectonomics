import { join, resolve } from "node:path"
import { parseArgs } from "node:util"
import { AGENTS, type AgentName } from "./agents"
import { previewArgs } from "./invoke"
import type { Persona } from "./persona"
import { promptFor } from "./prompt"
import type { Released } from "./release"

const DEFAULT_TIMEOUT_MINUTES = 40

/** The parsed command line of the eval runner. */
export interface Options {
	readonly agent: AgentName
	readonly personas: readonly string[] | undefined
	readonly release: string | undefined
	readonly trajCommand: string | undefined
	readonly timeoutMs: number
	readonly dryRun: boolean
	/** The results file to write, as given; undefined means `results/<release>-<agent>.md`. */
	readonly out: string | undefined
}

/** Reads the command line; throws with a plain message when a value is missing, unknown or out of range. */
export function parseOptions(argv: readonly string[]): Options {
	const { values } = parseArgs({
		args: argv.filter((word) => word !== "--"),
		options: {
			agent: { type: "string" },
			persona: { type: "string", multiple: true },
			release: { type: "string" },
			"traj-command": { type: "string" },
			"timeout-minutes": { type: "string" },
			"dry-run": { type: "boolean", default: false },
			out: { type: "string" },
		},
		strict: true,
		allowPositionals: false,
	})
	const agent = values.agent
	if (agent === undefined || !(AGENTS as readonly string[]).includes(agent)) {
		throw new Error(`--agent must be one of ${AGENTS.join(", ")}`)
	}
	const minutes = Number(values["timeout-minutes"] ?? DEFAULT_TIMEOUT_MINUTES)
	if (!Number.isFinite(minutes) || minutes <= 0) {
		throw new Error("--timeout-minutes must be a positive number of minutes")
	}
	return {
		agent: agent as AgentName,
		personas: values.persona,
		release: values.release,
		trajCommand: values["traj-command"],
		timeoutMs: minutes * 60_000,
		dryRun: values["dry-run"],
		out: values.out,
	}
}

/**
 * The results file a run writes: `--out` when given (relative to the directory the command ran in),
 * otherwise `<resultsDir>/<release>-<agent>.md`. Parallel processes pass different `--out` files so
 * none overwrites another's.
 */
export function resultsPath(
	options: Pick<Options, "out" | "agent">,
	label: string,
	resultsDir: string,
): string {
	if (options.out !== undefined) {
		if (options.out === "") throw new Error("--out needs a file path")
		return resolve(options.out)
	}
	return join(resultsDir, `${label}-${options.agent}.md`)
}

/** The personas whose ids were asked for, or all of them when no id was given; throws when none match. */
export function selectPersonas(
	all: readonly Persona[],
	ids: readonly string[] | undefined,
): Persona[] {
	const chosen = all.filter((persona) => ids === undefined || ids.includes(persona.id))
	if (chosen.length === 0) throw new Error(`no persona matches ${ids?.join(", ") ?? "any persona"}`)
	return chosen
}

/** Writes the dry run's plan: the release under test, then each persona's exact agent argv and workspace. */
export function printPlan(
	released: Released,
	agent: AgentName,
	personas: readonly Persona[],
	runRoot: string,
	resultsFile: string,
): void {
	process.stdout.write(`release under test: ${released.argv.join(" ")} (label ${released.label})\n`)
	process.stdout.write(`results file: ${resultsFile}\n`)
	for (const persona of personas) {
		process.stdout.write(`${persona.id}: ${previewArgs(agent, promptFor(persona))}\n`)
		process.stdout.write(`  cwd ${join(runRoot, persona.id, "workspace")}\n`)
	}
}
