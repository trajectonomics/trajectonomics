import { join } from "node:path"
import { parseArgs } from "node:util"
import { AGENTS, type AgentName } from "./agents"
import { previewArgs } from "./invoke"
import type { Persona } from "./persona"
import { promptFor } from "./prompt"
import type { Released } from "./release"

const DEFAULT_TIMEOUT_MINUTES = 40

export interface Options {
	readonly agent: AgentName
	readonly personas: readonly string[] | undefined
	readonly release: string | undefined
	readonly trajCommand: string | undefined
	readonly timeoutMs: number
	readonly dryRun: boolean
}

/** Reads the command line; throws with a plain message when a value is missing or unknown. */
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
		},
		strict: true,
		allowPositionals: false,
	})
	const agent = values.agent
	if (agent === undefined || !(AGENTS as readonly string[]).includes(agent)) {
		throw new Error(`--agent must be one of ${AGENTS.join(", ")}`)
	}
	return {
		agent: agent as AgentName,
		personas: values.persona,
		release: values.release,
		trajCommand: values["traj-command"],
		timeoutMs: Number(values["timeout-minutes"] ?? DEFAULT_TIMEOUT_MINUTES) * 60_000,
		dryRun: values["dry-run"],
	}
}

export function selectPersonas(
	all: readonly Persona[],
	ids: readonly string[] | undefined,
): Persona[] {
	const chosen = all.filter((persona) => ids === undefined || ids.includes(persona.id))
	if (chosen.length === 0) throw new Error(`no persona matches ${ids?.join(", ") ?? "any persona"}`)
	return chosen
}

export function printPlan(
	released: Released,
	agent: AgentName,
	personas: readonly Persona[],
	runRoot: string,
): void {
	process.stdout.write(`release under test: ${released.argv.join(" ")} (label ${released.label})\n`)
	for (const persona of personas) {
		process.stdout.write(`${persona.id}: ${previewArgs(agent, promptFor(persona))}\n`)
		process.stdout.write(`  cwd ${join(runRoot, persona.id, "workspace")}\n`)
	}
}
