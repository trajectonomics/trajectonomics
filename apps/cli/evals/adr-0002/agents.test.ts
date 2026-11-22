import { describe, expect, it } from "bun:test"
import {
	ANTIGRAVITY_MODEL,
	antigravityArgs,
	claudeArgs,
	isFreeLimit,
	OPENCODE_CONFIG,
	OPENCODE_FALLBACK_MODEL,
	OPENCODE_FREE_MODEL,
	opencodeArgs,
} from "./agents"
import { finalTextOf, modelOf } from "./final-answer"

describe("argv builders", () => {
	it("runs Claude headless with streamed events and only traj for Bash", () => {
		const args = claudeArgs("PROMPT")
		expect(args.slice(0, 2)).toEqual(["-p", "PROMPT"])
		expect(args).toContain("stream-json")
		expect(args[args.indexOf("--allowedTools") + 1]).toBe("Bash(traj:*)")
		expect(args).toContain("Read")
	})

	it("denies every Claude Code call but traj: Bash is the only tool, user settings are skipped, nothing prompts", () => {
		const args = claudeArgs("PROMPT")
		expect(args[args.indexOf("--tools") + 1]).toBe("Bash")
		expect(args[args.indexOf("--setting-sources") + 1]).toBe("project")
		expect(args[args.indexOf("--permission-mode") + 1]).toBe("dontAsk")
		expect(args).toContain("--strict-mcp-config")
	})

	it("runs agy in print mode with text output, on the Hydrogen model", () => {
		expect(antigravityArgs("PROMPT")).toEqual([
			"-p",
			"PROMPT",
			"--output-format",
			"text",
			"--model",
			"gemini-4-hydrogen-medium",
			"--dangerously-skip-permissions",
		])
	})

	it("never runs agy on gemini-3.8-flash (root AGENTS.md rule 7)", () => {
		expect(ANTIGRAVITY_MODEL.startsWith("gemini-4-hydrogen")).toBe(true)
		expect(antigravityArgs("PROMPT")).not.toContain("gemini-3.8-flash")
	})

	it("runs OpenCode with the model, JSON events and auto-approval", () => {
		expect(opencodeArgs("PROMPT", OPENCODE_FREE_MODEL)).toEqual([
			"run",
			"-m",
			"opencode/deepseek-v4.1-flash-free",
			"--format",
			"json",
			"--auto",
			"PROMPT",
		])
		expect(OPENCODE_FALLBACK_MODEL).toBe("opencode-go/deepseek-v4.1-flash")
	})

	it("denies OpenCode bash except traj", () => {
		const config = JSON.parse(OPENCODE_CONFIG) as { permission: { bash: Record<string, string> } }
		expect(config.permission.bash["*"]).toBe("deny")
		expect(config.permission.bash["traj *"]).toBe("allow")
	})

	it("denies OpenCode file reads, listings, searches, edits and web fetches", () => {
		const { permission } = JSON.parse(OPENCODE_CONFIG) as { permission: Record<string, string> }
		for (const tool of ["read", "glob", "grep", "list", "edit", "webfetch"]) {
			expect(permission[tool]).toBe("deny")
		}
	})
})

describe("finalTextOf", () => {
	it("takes the result of Claude's stream", () => {
		const stdout = [
			JSON.stringify({ type: "assistant", message: {} }),
			"not json at all",
			JSON.stringify({ type: "result", result: "done\n```json\n{}\n```" }),
		].join("\n")
		expect(finalTextOf("claude", stdout)).toBe("done\n```json\n{}\n```")
	})

	it("joins OpenCode's text parts and ignores other events", () => {
		const stdout = [
			JSON.stringify({ type: "step_start", part: { type: "step-start" } }),
			JSON.stringify({ type: "text", part: { type: "text", text: "first" } }),
			JSON.stringify({ type: "text", part: { type: "text", text: "second" } }),
		].join("\n")
		expect(finalTextOf("opencode", stdout)).toBe("first\nsecond")
	})

	it("returns agy's text as it is", () => {
		expect(finalTextOf("antigravity", "plain answer")).toBe("plain answer")
	})

	it("returns an empty string when Claude emitted no result event", () => {
		expect(finalTextOf("claude", JSON.stringify({ type: "assistant" }))).toBe("")
	})
})

describe("modelOf", () => {
	const init = JSON.stringify({
		type: "system",
		subtype: "init",
		cwd: "/work",
		session_id: "s",
		tools: ["Bash"],
		model: "claude-opus-5-5",
	})

	it("reads the model from Claude's first system init event", () => {
		const stdout = [
			JSON.stringify({ type: "system", subtype: "hook_started", hook_name: "SessionStart" }),
			init,
			JSON.stringify({ type: "result", result: "done" }),
		].join("\n")
		expect(modelOf("claude", stdout)).toBe("claude-opus-5-5")
	})

	it("is null when the stream has no init event or names no model", () => {
		expect(modelOf("claude", JSON.stringify({ type: "result", result: "x" }))).toBeNull()
		expect(modelOf("claude", JSON.stringify({ type: "system", subtype: "init" }))).toBeNull()
		expect(modelOf("claude", "")).toBeNull()
	})

	it("is null for agents whose output does not name the model", () => {
		expect(modelOf("opencode", init)).toBeNull()
		expect(modelOf("antigravity", init)).toBeNull()
	})
})

describe("isFreeLimit", () => {
	it("recognises the free tier's usage-limit refusals", () => {
		expect(isFreeLimit("Error: free usage limit reached")).toBe(true)
		expect(isFreeLimit("rate limit exceeded")).toBe(true)
		expect(isFreeLimit("PROBE-OK")).toBe(false)
	})
})
