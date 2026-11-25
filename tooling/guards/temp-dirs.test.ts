import { describe, expect, it } from "bun:test"
import { lstatSync } from "node:fs"
import { join } from "node:path"
import { isChecked, unremovedTempDirs } from "./temp-dirs"

const ROOT = join(import.meta.dir, "..", "..")

/** Every tracked regular file of the repository, in git's order. Symlinks are links, not content. */
const trackedFiles = Bun.spawnSync(["git", "ls-files", "-z"], { cwd: ROOT })
	.stdout.toString()
	.split("\0")
	.filter((path) => path.length > 0 && lstatSync(join(ROOT, path)).isFile())

describe("temporary directories made by a source file", () => {
	it("names a file that makes one and never removes it", () => {
		const files = [
			{ path: "a.test.ts", text: 'const dir = await mkdtemp(join(tmpdir(), "traj-"))' },
			{ path: "b.ts", text: 'const dir = mkdtempSync(join(tmpdir(), "x-"))' },
		]
		expect(unremovedTempDirs(files)).toEqual(["a.test.ts", "b.ts"])
	})

	it("passes a file that removes what it makes, or makes nothing", () => {
		const files = [
			{ path: "a.ts", text: "const d = await mkdtemp(p)\nawait rm(d, { recursive: true })" },
			{ path: "b.ts", text: "const d = mkdtempSync(p)\nrmSync(d, { recursive: true })" },
			{ path: "c.ts", text: "const d = makeTempDir()" },
			{ path: "d.ts", text: "const mkdtempPrefix = 'traj-'" },
		]
		expect(unremovedTempDirs(files)).toEqual([])
	})

	it("does not count an rm that appears only in a line comment", () => {
		const files = [
			{ path: "a.ts", text: "const d = await mkdtemp(p) // then rm(d) in the caller\n" },
		]
		expect(unremovedTempDirs(files)).toEqual(["a.ts"])
	})

	it("exempts a file whose helper removes the directory, and only with a reason", () => {
		const files = [{ path: "a.ts", text: "const d = mkdtempSync(p)" }]
		const allowed = new Map([["a.ts", "the sweep in temp-dir.ts removes it"]])
		expect(unremovedTempDirs(files, allowed)).toEqual([])
		expect(unremovedTempDirs(files, new Map([["b.ts", "another file"]]))).toEqual(["a.ts"])
	})

	it("reads source code outside build output and vendored skills", () => {
		expect(isChecked("apps/web/scripts/loans.test.ts")).toBe(true)
		expect(isChecked("tooling/release/version.test.ts")).toBe(true)
		expect(isChecked("apps/cli/dist/index.js")).toBe(false)
		expect(isChecked(".agents/skills/x/index.ts")).toBe(false)
		expect(isChecked("apps/cli/README.md")).toBe(false)
	})

	it("is removed by every tracked file of the repository that makes one", async () => {
		const files = await Promise.all(
			trackedFiles.filter(isChecked).map(async (path) => ({
				path,
				text: await Bun.file(join(ROOT, path)).text(),
			})),
		)
		expect(unremovedTempDirs(files)).toEqual([])
	})
})
