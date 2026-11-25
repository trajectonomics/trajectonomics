import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { listRecentFiles } from "../src/stores/files"

const dirs: string[] = []

function tempDir(): string {
	const dir = mkdtempSync(join(tmpdir(), "collector-files-"))
	dirs.push(dir)
	return dir
}

afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe("listRecentFiles", () => {
	test("skips files older than the cutoff only when one is given", () => {
		const dir = tempDir()
		const oldFile = join(dir, "old.jsonl")
		const newFile = join(dir, "new.jsonl")
		writeFileSync(oldFile, '{"synthetic":true}\n')
		writeFileSync(newFile, '{"synthetic":true}\n')
		utimesSync(oldFile, new Date("2026-11-20T00:00:00.000Z"), new Date("2026-11-20T00:00:00.000Z"))
		utimesSync(newFile, new Date("2026-11-24T00:00:00.000Z"), new Date("2026-11-24T00:00:00.000Z"))
		const cutoff = Date.parse("2026-11-23T00:00:00.000Z")
		const match = (path: string) => path.endsWith(".jsonl")

		expect(listRecentFiles(dir, match, cutoff)).toEqual([newFile])
		expect(listRecentFiles(dir, match, null).sort()).toEqual([newFile, oldFile].sort())
	})

	test("returns nothing for a missing root", () => {
		expect(listRecentFiles(join(tempDir(), "absent"), () => true, 0)).toEqual([])
	})
})
