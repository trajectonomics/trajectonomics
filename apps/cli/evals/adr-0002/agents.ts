/**
 * How each agent CLI runs headless: its argv, its permission setup and whether its output is a
 * usage-limit refusal. Nothing here talks to a model; reading the answer is in final-answer.ts.
 */

export const AGENTS = ["claude", "antigravity", "opencode"] as const
export type AgentName = (typeof AGENTS)[number]

/** The executable each agent is looked up as on PATH. */
export const AGENT_BINARY: Record<AgentName, string> = {
	claude: "claude",
	antigravity: "agy",
	opencode: "opencode",
}

/** The free OpenCode model the owner's quota runs first, and the paid one it falls back to. */
export const OPENCODE_FREE_MODEL = "opencode/deepseek-v4.1-flash-free"
export const OPENCODE_FALLBACK_MODEL = "opencode-go/deepseek-v4.1-flash"

/** Claude Code: headless, streamed events; only `traj` may run, and no file or web reads are offered. */
export function claudeArgs(prompt: string): string[] {
	return [
		"-p",
		prompt,
		"--output-format",
		"stream-json",
		"--verbose",
		"--allowedTools",
		"Bash(traj:*)",
		"--disallowedTools",
		"Read",
		"Glob",
		"Grep",
		"Edit",
		"Write",
		"NotebookEdit",
		"WebFetch",
		"WebSearch",
	]
}

/** Antigravity's `agy`: one print-mode turn with plain text out; shell permissions are skipped in the sandbox cwd. */
export function antigravityArgs(prompt: string): string[] {
	return ["-p", prompt, "--output-format", "text", "--dangerously-skip-permissions"]
}

/** OpenCode: JSON events on stdout, with permissions not denied auto-approved. */
export function opencodeArgs(prompt: string, model: string): string[] {
	return ["run", "-m", model, "--format", "json", "--auto", prompt]
}

/** The OpenCode permission config passed through `OPENCODE_CONFIG_CONTENT`: bash only for `traj`. */
export const OPENCODE_CONFIG: string = JSON.stringify({
	permission: {
		bash: { "*": "deny", "traj *": "allow", traj: "allow" },
		edit: "deny",
		webfetch: "deny",
	},
})

/** True when an OpenCode run stopped on the free tier's usage limit, which triggers the paid fallback. */
export function isFreeLimit(output: string): boolean {
	return /free usage limit|usage limit|rate limit|quota/i.test(output)
}
