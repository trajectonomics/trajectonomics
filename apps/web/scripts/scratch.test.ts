import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { makeScratch, removeScratch } from "./scratch"

describe("a scratch directory", () => {
	test("is made under the temporary directory and removed, twice without error", async () => {
		const dir = await makeScratch("traj-web-scratch-test-")
		expect(existsSync(dir)).toBe(true)
		await removeScratch(dir)
		expect(existsSync(dir)).toBe(false)
		await removeScratch(dir)
	})

	test.each([
		["SIGTERM", 143],
		["SIGINT", 130],
	] as const)("is removed when the run gets %s, which exits %d", async (signal, code) => {
		const isolated = await makeScratch("traj-web-scratch-test-")
		try {
			const child = Bun.spawn(["bun", join(import.meta.dir, "scratch-victim.ts")], {
				env: { ...process.env, TMPDIR: isolated },
				stdout: "pipe",
			})
			const made = new TextDecoder().decode((await child.stdout.getReader().read()).value).trim()
			expect(existsSync(made)).toBe(true)
			child.kill(signal)
			expect(await child.exited).toBe(code)
			expect(existsSync(made)).toBe(false)
		} finally {
			await removeScratch(isolated)
		}
	})
})
