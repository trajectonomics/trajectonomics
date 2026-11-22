import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { makeTempDir } from "./temp-dir"

const SRC = import.meta.dir
const HELPER = "temp-dir.ts"
const GUARD = "temp-dir.test.ts"

describe("makeTempDir", () => {
	it("makes a directory under the system temporary directory", () => {
		const dir = makeTempDir("traj-temp-dir-test-")
		expect(existsSync(dir)).toBe(true)
		expect(dir.startsWith(tmpdir())).toBe(true)
	})
})

describe("temporary directories", () => {
	it("are made only through makeTempDir, so the run removes them", () => {
		const offenders: string[] = []
		for (const file of new Bun.Glob("**/*.ts").scanSync({ cwd: SRC })) {
			if (file === HELPER || file === GUARD) continue
			const text = readFileSync(join(SRC, file), "utf8")
			if (/\bmkdtemp(Sync)?\b/.test(text)) offenders.push(file)
		}
		expect(offenders).toEqual([])
	})
})
