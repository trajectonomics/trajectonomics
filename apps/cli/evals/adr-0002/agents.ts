/**
 * How each agent CLI runs headless: its argv, its permission setup and whether its output is a
 * usage-limit refusal. Nothing here talks to a model; reading the answer is in final-answer.ts.
 */

/** The agent CLIs the eval can drive, by the names `--agent` takes. */
export const AGENTS = ["claude", "antigravity", "opencode"] as const
/** One of AGENTS: the agent a run is driven by. */
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

/**
 * Claude Code: headless, streamed events, and a shell that can run only `traj`. A deny rule cannot
 * express "everything except traj", and the user's own settings may allow Bash, so four flags work
 * together (probed on Claude Code 2.1.330):
 * - `--tools Bash` offers no tool but Bash (no file, web, ToolSearch or MCP tools);
 * - `--setting-sources project` skips the user's and local settings files, so their Bash allow rules
 *   do not apply (the workspace has no project settings);
 * - `--permission-mode dontAsk` denies every call not pre-approved, with no prompt in headless mode;
 * - `--allowedTools Bash(traj:*)` pre-approves `traj`, the one thing that may run.
 * Claude Code's built-in read-only commands (`ls`, `pwd`, `grep` inside the workspace) still run:
 * they cannot write, and they cannot read outside the workspace. The prompt stays first because the
 * flags after it take several values.
 */
export function claudeArgs(prompt: string): string[] {
	return [
		"-p",
		prompt,
		"--output-format",
		"stream-json",
		"--verbose",
		"--tools",
		"Bash",
		"--setting-sources",
		"project",
		"--strict-mcp-config",
		"--permission-mode",
		"dontAsk",
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

/**
 * The Gemini model `agy` runs. `agy models` lists the Hydrogen family only with an effort suffix
 * (there is no bare `gemini-4-hydrogen`), so this names the medium-effort model (root AGENTS.md
 * rule 7).
 */
export const ANTIGRAVITY_MODEL = "gemini-4-hydrogen-medium"

/** Antigravity's `agy`: one print-mode turn with plain text out, on ANTIGRAVITY_MODEL; shell permissions are skipped in the sandbox cwd. */
export function antigravityArgs(prompt: string): string[] {
	return [
		"-p",
		prompt,
		"--output-format",
		"text",
		"--model",
		ANTIGRAVITY_MODEL,
		"--dangerously-skip-permissions",
	]
}

/** OpenCode: JSON events on stdout, with permissions not denied auto-approved. */
export function opencodeArgs(prompt: string, model: string): string[] {
	return ["run", "-m", model, "--format", "json", "--auto", prompt]
}

/**
 * The OpenCode permission config passed through `OPENCODE_CONFIG_CONTENT`: bash only for `traj`,
 * and no file reads, listings, searches, edits or web fetches.
 */
export const OPENCODE_CONFIG: string = JSON.stringify({
	permission: {
		bash: { "*": "deny", "traj *": "allow", traj: "allow" },
		edit: "deny",
		read: "deny",
		glob: "deny",
		grep: "deny",
		list: "deny",
		webfetch: "deny",
	},
})

/** True when an OpenCode run stopped on the free tier's usage limit, which triggers the paid fallback. */
export function isFreeLimit(output: string): boolean {
	return /free usage limit|usage limit|rate limit|quota/i.test(output)
}
