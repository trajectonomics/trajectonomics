import { afterAll, describe, expect, it } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { installTrajWrapper, makeRunDirs, sandboxPath, wrapperSource } from "./sandbox"

// Scratch space lives under the cache, never under /tmp (AGENTS.md rule 8).
const scratch = mkdtempSync(join(homedir(), ".cache", "eval-harness", "test-sandbox-"))
afterAll(() => rmSync(scratch, { recursive: true, force: true }))

describe("sandbox", () => {
	it("creates the run's home, bin and workspace, and no others", () => {
		const dirs = makeRunDirs(join(scratch, "run-a"))
		for (const dir of [dirs.home, dirs.bin, dirs.workspace]) expect(existsSync(dir)).toBe(true)
		expect(dirs.callLog).toBe(join(scratch, "run-a", "calls.jsonl"))
	})

	it("writes an executable traj shim that forwards to the release and logs the call", () => {
		const dirs = makeRunDirs(join(scratch, "run-b"))
		const path = installTrajWrapper(dirs, "/usr/bin/bun", [
			"npx",
			"-y",
			"@trajectonomics/cli@0.4.0",
		])
		expect(path).toBe(join(dirs.bin, "traj"))
		expect(statSync(path).mode & 0o111).not.toBe(0)
		const source = readFileSync(path, "utf8")
		expect(source.startsWith("#!/usr/bin/bun\n")).toBe(true)
		expect(source).toContain('["npx","-y","@trajectonomics/cli@0.4.0"]')
		expect(source).toContain(JSON.stringify(dirs.callLog))
	})

	it("builds the shim source from its arguments only", () => {
		const source = wrapperSource("/bun", "/log.jsonl", ["traj"])
		expect(source).toContain('const release = ["traj"]')
		expect(source).toContain('"/log.jsonl"')
	})

	it("puts the shim first and no repository directory on PATH", () => {
		expect(sandboxPath("/run/bin", "/node/bin")).toBe(
			"/run/bin:/node/bin:/usr/local/bin:/usr/bin:/bin",
		)
	})
})
