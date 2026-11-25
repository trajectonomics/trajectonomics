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

	test.each([["SIGTERM"], ["SIGINT"]] as const)(
		"is removed when the run dies by %s",
		async (signal) => {
			const isolated = await makeScratch("traj-web-scratch-test-")
			try {
				const child = Bun.spawn(["bun", join(import.meta.dir, "scratch-victim.ts")], {
					env: { ...process.env, TMPDIR: isolated },
					stdout: "pipe",
				})
				const made = new TextDecoder().decode((await child.stdout.getReader().read()).value).trim()
				expect(existsSync(made)).toBe(true)
				child.kill(signal)
				await child.exited
				expect(child.signalCode).toBe(signal)
				expect(existsSync(made)).toBe(false)
			} finally {
				await removeScratch(isolated)
			}
		},
	)
})
