import type { AgentName } from "./agents"

/** The text of the final answer, from an agent's captured stdout. Empty when none is found. */
export function finalTextOf(agent: AgentName, stdout: string): string {
	if (agent === "antigravity") return stdout
	if (agent === "claude") return claudeFinal(stdout)
	return opencodeFinal(stdout)
}

/**
 * The model the agent ran, when its output names it: Claude Code's first `system` `init` event
 * carries `model`. Null for an agent whose output does not (OpenCode's model is known from the
 * argv it ran with).
 */
export function modelOf(agent: AgentName, stdout: string): string | null {
	if (agent !== "claude") return null
	for (const event of linesAsJson(stdout)) {
		if (event["type"] === "system" && event["subtype"] === "init") {
			const model = event["model"]
			return typeof model === "string" && model !== "" ? model : null
		}
	}
	return null
}

function claudeFinal(stdout: string): string {
	let result = ""
	for (const event of linesAsJson(stdout)) {
		if (event["type"] === "result" && typeof event["result"] === "string") result = event["result"]
	}
	return result
}

function opencodeFinal(stdout: string): string {
	const texts: string[] = []
	for (const event of linesAsJson(stdout)) {
		const part = event["part"]
		if (event["type"] === "text" && isRecord(part) && typeof part["text"] === "string") {
			texts.push(part["text"])
		}
	}
	return texts.join("\n")
}

function linesAsJson(stdout: string): Record<string, unknown>[] {
	const events: Record<string, unknown>[] = []
	for (const line of stdout.split("\n")) {
		const trimmed = line.trim()
		if (!trimmed.startsWith("{")) continue
		try {
			const parsed: unknown = JSON.parse(trimmed)
			if (isRecord(parsed)) events.push(parsed)
		} catch {
			// A line that is not JSON is not an event; skip it.
		}
	}
	return events
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}
