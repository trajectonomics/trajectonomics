import { describe, expect, it } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { LLMS_FILE, LLMS_TXT } from "../src/lib/crawl/llms"
import { LLMS_FULL_FILE, LLMS_FULL_TXT } from "../src/lib/crawl/llms-full"
import { writeLlmsFiles } from "./llms-txt"

describe("the Answer engine files' write step", () => {
	it("writes both files into the static directory, each exactly as the Pure Core renders it", async () => {
		const destination = await mkdtemp(join(tmpdir(), "site-llms-"))
		try {
			const bytes = await writeLlmsFiles(destination)
			expect(await Bun.file(join(destination, LLMS_FILE)).text()).toBe(LLMS_TXT)
			expect(await Bun.file(join(destination, LLMS_FULL_FILE)).text()).toBe(LLMS_FULL_TXT)
			expect(bytes).toBe(Buffer.byteLength(LLMS_TXT) + Buffer.byteLength(LLMS_FULL_TXT))
		} finally {
			await rm(destination, { recursive: true, force: true })
		}
	})
})
