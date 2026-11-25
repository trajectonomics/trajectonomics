import { describe, expect, it } from "bun:test"
import { chmodSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { makeTempDir, sweepTempDirs } from "./temp-dir"

const SRC = import.meta.dir
const HELPER = "temp-dir.ts"
const GUARD = "temp-dir.test.ts"
/**
 * Production files that may make their own temporary directory, which a test helper must never
 * serve. Empty today; a production caller is named here, beside why it needs one.
 */
const PRODUCTION_CALLERS = new Set<string>([])

describe("makeTempDir", () => {
	it("makes a directory under the system temporary directory", () => {
		const dir = makeTempDir("traj-temp-dir-test-")
		expect(existsSync(dir)).toBe(true)
		expect(dir.startsWith(tmpdir())).toBe(true)
	})

	it("is removed by the sweep even when a test left it read-only", () => {
		const dir = makeTempDir("traj-temp-dir-test-")
		mkdirSync(join(dir, "home", "nested"), { recursive: true })
		chmodSync(join(dir, "home", "nested"), 0o500)
		chmodSync(join(dir, "home"), 0o500)
		sweepTempDirs()
		expect(existsSync(dir)).toBe(false)
	})
})

describe("a run that is killed", () => {
	it.each([
		["SIGTERM", 143],
		["SIGINT", 130],
	] as const)("removes its directories on %s and exits %d", async (signal, code) => {
		const isolated = makeTempDir("traj-temp-dir-test-")
		const child = Bun.spawn(["bun", join(SRC, "temp-dir-victim.ts")], {
			env: { ...process.env, TMPDIR: isolated },
			stdout: "pipe",
		})
		const reader = child.stdout.getReader()
		const made = new TextDecoder().decode((await reader.read()).value).trim()
		expect(existsSync(made)).toBe(true)
		child.kill(signal)
		expect(await child.exited).toBe(code)
		expect(existsSync(made)).toBe(false)
	})
})

describe("temporary directories", () => {
	it("are made only through makeTempDir, so the run removes them", () => {
		const offenders: string[] = []
		for (const file of new Bun.Glob("**/*.ts").scanSync({ cwd: SRC })) {
			if (file === HELPER || file === GUARD || PRODUCTION_CALLERS.has(file)) continue
			const text = readFileSync(join(SRC, file), "utf8")
			if (/\bmkdtemp(Sync)?\b/.test(text)) offenders.push(file)
		}
		expect(offenders).toEqual([])
	})
})
