import { describe, expect, it } from "bun:test"
import {
	antigravityArgs,
	claudeArgs,
	isFreeLimit,
	OPENCODE_CONFIG,
	OPENCODE_FALLBACK_MODEL,
	OPENCODE_FREE_MODEL,
	opencodeArgs,
} from "./agents"
import { finalTextOf } from "./final-answer"

describe("argv builders", () => {
	it("runs Claude headless with streamed events and only traj for Bash", () => {
		const args = claudeArgs("PROMPT")
		expect(args.slice(0, 2)).toEqual(["-p", "PROMPT"])
		expect(args).toContain("stream-json")
		expect(args[args.indexOf("--allowedTools") + 1]).toBe("Bash(traj:*)")
		expect(args).toContain("Read")
	})

	it("runs agy in print mode with text output", () => {
		expect(antigravityArgs("PROMPT")).toEqual([
			"-p",
			"PROMPT",
			"--output-format",
			"text",
			"--dangerously-skip-permissions",
		])
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

describe("isFreeLimit", () => {
	it("recognises the free tier's usage-limit refusals", () => {
		expect(isFreeLimit("Error: free usage limit reached")).toBe(true)
		expect(isFreeLimit("rate limit exceeded")).toBe(true)
		expect(isFreeLimit("PROBE-OK")).toBe(false)
	})
})
