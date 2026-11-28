import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runQuotaCommandProc } from "../src/commands/quota"
import { listAcpTokenPaths } from "../src/quota/antigravity-acp"
import {
	findAntigravityTokenPath,
	resolveAgyBinary,
	resolveMuseBinary,
} from "../src/quota/credentials-extra"

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

	test("prefers the latest token expiry over a newer mtime, including the antigravity-cli path", () =>
		withTempHome((home) => {
			const gemini = join(home, ".gemini/antigravity/antigravity-oauth-token")
			const cli = join(home, ".gemini/antigravity-cli/antigravity-oauth-token")
			const t3 = join(
				home,
				".t3/userdata/providers/antigravity/p1/antigravity-acp/antigravity-oauth-token",
			)
			for (const path of [gemini, cli, t3]) mkdirSync(join(path, ".."), { recursive: true })
			const token = (expiry: unknown) =>
				JSON.stringify({ token: { access_token: "synthetic-ag", expiry } })
			writeFileSync(gemini, token("2026-11-27T16:00:00.000Z"))
			writeFileSync(cli, token("2026-11-27T15:00:00.000Z"))
			writeFileSync(t3, token("not-a-date"))
			utimesSync(gemini, new Date("2026-11-20T00:00:00Z"), new Date("2026-11-20T00:00:00Z"))
			utimesSync(cli, new Date("2026-11-26T00:00:00Z"), new Date("2026-11-26T00:00:00Z"))
			utimesSync(t3, new Date("2026-11-27T00:00:00Z"), new Date("2026-11-27T00:00:00Z"))
			expect(findAntigravityTokenPath(home)).toBe(gemini)
			writeFileSync(cli, token("2026-11-27T17:00:00.000Z"))
			expect(findAntigravityTokenPath(home)).toBe(cli)
		}))
})

describe("listAcpTokenPaths", () => {
	test("lists existing acp_token.json files newest first", () =>
		withTempHome((home) => {
			expect(listAcpTokenPaths(home)).toEqual([])
			const gemini = join(home, ".gemini/antigravity-acp/acp_token.json")
			const t3 = join(home, ".t3/userdata/providers/antigravity/p1/antigravity-acp/acp_token.json")
			for (const path of [gemini, t3]) mkdirSync(join(path, ".."), { recursive: true })
			writeFileSync(gemini, "{}")
			writeFileSync(t3, "{}")
			utimesSync(gemini, new Date("2026-11-20T00:00:00Z"), new Date("2026-11-20T00:00:00Z"))
			utimesSync(t3, new Date("2026-11-25T00:00:00Z"), new Date("2026-11-25T00:00:00Z"))
			expect(listAcpTokenPaths(home)).toEqual([t3, gemini])
		}))

	test("ignores provider folders without an acp_token.json", () =>
		withTempHome((home) => {
			const dir = join(home, ".t3/userdata/providers/antigravity/p2/antigravity-acp")
			mkdirSync(dir, { recursive: true })
			writeFileSync(join(dir, "acp_token.json.example"), "{}")
			expect(listAcpTokenPaths(home)).toEqual([])
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

describe("resolveAgyBinary", () => {
	test("prefers ~/.local/bin/agy when present and falls back to PATH", () =>
		withTempHome((home) => {
			expect(resolveAgyBinary(home)).toBe("agy")
			const localBin = join(home, ".local/bin/agy")
			mkdirSync(join(home, ".local/bin"), { recursive: true })
			writeFileSync(localBin, "#!/bin/sh\n")
			expect(resolveAgyBinary(home)).toBe(localBin)
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
