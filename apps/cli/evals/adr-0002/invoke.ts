import {
	AGENT_BINARY,
	type AgentName,
	antigravityArgs,
	claudeArgs,
	isFreeLimit,
	OPENCODE_CONFIG,
	OPENCODE_FALLBACK_MODEL,
	OPENCODE_FREE_MODEL,
	opencodeArgs,
} from "./agents"

/** What one agent process printed and how it ended. */
export interface Invocation {
	readonly stdout: string
	readonly stderr: string
	readonly exitCode: number
	readonly timedOut: boolean
	readonly model: string | null
}

type Env = Record<string, string | undefined>

/** Runs one process to its end, or kills it at the timeout, capturing both streams. */
export async function spawnAgent(
	bin: string,
	args: readonly string[],
	cwd: string,
	env: Env,
	timeoutMs: number,
): Promise<Invocation> {
	const proc = Bun.spawn([bin, ...args], {
		cwd,
		env,
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
	})
	let timedOut = false
	const timer = setTimeout(() => {
		timedOut = true
		proc.kill()
	}, timeoutMs)
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	])
	const exitCode = await proc.exited
	clearTimeout(timer)
	return { stdout, stderr, exitCode, timedOut, model: null }
}

/** Starts one agent for one persona. OpenCode retries once on the paid model at the free limit. */
export async function invokeAgent(input: {
	agent: AgentName
	bin: string
	prompt: string
	cwd: string
	env: Env
	timeoutMs: number
}): Promise<Invocation> {
	const { agent, bin, prompt, cwd, env, timeoutMs } = input
	if (agent === "claude") return spawnAgent(bin, claudeArgs(prompt), cwd, env, timeoutMs)
	if (agent === "antigravity") return spawnAgent(bin, antigravityArgs(prompt), cwd, env, timeoutMs)
	const opencodeEnv = { ...env, OPENCODE_CONFIG_CONTENT: OPENCODE_CONFIG }
	const free = await spawnAgent(
		bin,
		opencodeArgs(prompt, OPENCODE_FREE_MODEL),
		cwd,
		opencodeEnv,
		timeoutMs,
	)
	if (!isFreeLimit(free.stdout + free.stderr)) return { ...free, model: OPENCODE_FREE_MODEL }
	const paid = await spawnAgent(
		bin,
		opencodeArgs(prompt, OPENCODE_FALLBACK_MODEL),
		cwd,
		opencodeEnv,
		timeoutMs,
	)
	return { ...paid, model: OPENCODE_FALLBACK_MODEL }
}

/** The agent's argv with the prompt shortened, for the dry run. */
export function previewArgs(agent: AgentName, prompt: string): string {
	const args =
		agent === "claude"
			? claudeArgs(prompt)
			: agent === "antigravity"
				? antigravityArgs(prompt)
				: opencodeArgs(prompt, OPENCODE_FREE_MODEL)
	return [
		AGENT_BINARY[agent],
		...args.map((arg) => (arg === prompt ? `<prompt ${prompt.length} chars>` : arg)),
	].join(" ")
}
