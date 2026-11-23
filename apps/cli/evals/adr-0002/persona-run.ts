import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { AgentName } from "./agents"
import { type FlagTable, inventedFlagsOf, parseCallLog } from "./calls"
import { finalTextOf, modelOf } from "./final-answer"
import { type Invocation, invokeAgent } from "./invoke"
import { expectedAnswers } from "./oracle"
import type { Persona } from "./persona"
import { promptFor } from "./prompt"
import type { Released } from "./release"
import type { RunRow } from "./report"
import { agentEnv, installTrajWrapper, makeRunDirs } from "./sandbox"
import { parseAnswer, scoreCorrectness } from "./score"

/** Everything one persona's run needs from the runner. */
export interface PersonaRunInput {
	readonly persona: Persona
	readonly agent: AgentName
	readonly bin: string
	readonly released: Released
	readonly reference: { readonly names: readonly string[]; readonly table: FlagTable }
	readonly runRoot: string
	readonly timeoutMs: number
}

function statusOf(invocation: Invocation, finalText: string): string {
	if (invocation.timedOut) return "timed out"
	if (invocation.exitCode !== 0) return `agent exited ${invocation.exitCode}`
	return parseAnswer(finalText) === null ? "no answer block" : "ok"
}

/** Runs one persona through one agent in its own sandbox and returns its results row. */
export async function runPersona(input: PersonaRunInput): Promise<RunRow> {
	const { persona, agent, released, reference } = input
	const dirs = makeRunDirs(join(input.runRoot, persona.id))
	installTrajWrapper(dirs, process.execPath, released.argv)
	const nodeDir = dirname(Bun.which("node") ?? "/usr/bin/node")
	const env = agentEnv(process.env, dirs, nodeDir)
	const expected = expectedAnswers(persona)
	const invocation = await invokeAgent({
		agent,
		bin: input.bin,
		prompt: promptFor(persona),
		cwd: dirs.workspace,
		env,
		timeoutMs: input.timeoutMs,
	})
	writeFileSync(dirs.transcript, invocation.stdout)
	writeFileSync(dirs.stderr, invocation.stderr)
	const calls = existsSync(dirs.callLog) ? parseCallLog(readFileSync(dirs.callLog, "utf8")) : []
	const finalText = finalTextOf(agent, invocation.stdout)
	const invented = calls.reduce(
		(sum, call) => sum + inventedFlagsOf(call.argv, reference.names, reference.table).length,
		0,
	)
	return {
		persona: persona.id,
		status: statusOf(invocation, finalText),
		expected,
		given: parseAnswer(finalText),
		correctness: scoreCorrectness(finalText, expected),
		calls: calls.length,
		errors: calls.filter((call) => call.exitCode !== 0).length,
		invented,
		model: invocation.model ?? modelOf(agent, invocation.stdout) ?? "n/a",
	}
}
