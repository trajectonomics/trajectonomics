import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runQuotaCommandProc } from "../src/commands/quota"
import { findAntigravityTokenPath, resolveMuseBinary } from "../src/quota/credentials-extra"

function withTempHome(run: (home: string) => void | Promise<void>): Promise<void> | void {
	const dir = mkdtempSync(join(tmpdir(), "traj-quota-test-"))
	try {
		const result = run(dir)
		if (result instanceof Promise) {
			return result.finally(() => rmSync(dir, { recursive: true, force: true }))
		}
		rmSync(dir, { recursive: true, force: true })
	} catch (error) {
		rmSync(dir, { recursive: true, force: true })
		throw error
	}
}

describe("findAntigravityTokenPath", () => {
	test("picks the newest token file across .gemini and T3 provider roots", () =>
		withTempHome((home) => {
			expect(findAntigravityTokenPath(home)).toBeNull()
			const gemini = join(home, ".gemini/antigravity/antigravity-oauth-token")
			const t3 = join(
				home,
				".t3/userdata/providers/antigravity/p1/antigravity-acp/antigravity-oauth-token",
			)
			mkdirSync(join(home, ".gemini/antigravity"), { recursive: true })
			mkdirSync(join(home, ".t3/userdata/providers/antigravity/p1/antigravity-acp"), {
				recursive: true,
			})
			writeFileSync(gemini, "{}")
			writeFileSync(t3, "{}")
			utimesSync(gemini, new Date("2026-11-20T00:00:00Z"), new Date("2026-11-20T00:00:00Z"))
			utimesSync(t3, new Date("2026-11-25T00:00:00Z"), new Date("2026-11-25T00:00:00Z"))
			expect(findAntigravityTokenPath(home)).toBe(t3)
		}))
})

describe("resolveMuseBinary", () => {
	test("prefers ~/.local/bin/muse when present and falls back to PATH", () =>
		withTempHome((home) => {
			expect(resolveMuseBinary(home)).toBe("muse")
			const localBin = join(home, ".local/bin/muse")
			mkdirSync(join(home, ".local/bin"), { recursive: true })
			writeFileSync(localBin, "#!/bin/sh\n")
			expect(resolveMuseBinary(home)).toBe(localBin)
		}))
})

describe("runQuotaCommandProc", () => {
	test("returns null when the binary does not exist", async () => {
		expect(await runQuotaCommandProc(["definitely-nonexistent-quota-bin-xyz"])).toBeNull()
	})

	test("enforces a hard deadline even if the child traps SIGTERM", async () => {
		const started = Date.now()
		const result = await runQuotaCommandProc(["sh", "-c", "trap '' TERM; sleep 5"], 250)
		const elapsed = Date.now() - started
		expect(result).toEqual({ exitCode: 124, stdout: "" })
		expect(elapsed).toBeLessThan(2000)
	})
})
