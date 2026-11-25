import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createCommandReferenceDeps } from "./command-reference"

describe("the published CLI's temporary directory", () => {
	test("dispose does nothing when no call was made", async () => {
		await createCommandReferenceDeps().dispose()
	})

	test("dispose removes the directory the calls ran in", async () => {
		const bin = await mkdtemp(join(tmpdir(), "command-reference-bunx-"))
		try {
			await writeFile(join(bin, "bunx"), "#!/bin/sh\npwd\n")
			await chmod(join(bin, "bunx"), 0o755)
			const deps = createCommandReferenceDeps(join(bin, "bunx"))
			const ranIn = (await deps.cliText("0.0.0", []))?.trim() ?? ""
			expect(existsSync(ranIn)).toBe(true)
			await deps.dispose()
			expect(existsSync(ranIn)).toBe(false)
		} finally {
			await rm(bin, { recursive: true, force: true })
		}
	})
})
