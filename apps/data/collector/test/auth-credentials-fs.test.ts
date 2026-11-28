import { afterEach, describe, expect, test } from "bun:test"
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	statSync,
	symlinkSync,
	writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { FILE_DEPS } from "../src/auth/credential-fs"
import { readCredentials, writeCredentials } from "../src/auth/credentials"
import { credentials } from "./support/auth"

let root: string | null = null

function makeConfigDir(): { dir: string; file: string } {
	root = mkdtempSync(join(tmpdir(), "traj-cred-"))
	const dir = join(root, ".config/traj-data")
	mkdirSync(dir, { recursive: true, mode: 0o775 })
	chmodSync(dir, 0o775)
	return { dir, file: join(dir, "credentials.json") }
}

function modeOf(path: string): number {
	return statSync(path).mode & 0o777
}

afterEach(() => {
	if (root !== null) rmSync(root, { recursive: true, force: true })
	root = null
})

describe("credentials on a real filesystem", () => {
	test("tightens an existing directory to 700 and writes a 600 file", () => {
		const { dir, file } = makeConfigDir()
		writeCredentials(file, credentials(), FILE_DEPS)

		expect(modeOf(dir)).toBe(0o700)
		expect(modeOf(file)).toBe(0o600)
		expect(readdirSync(dir)).toEqual(["credentials.json"])
		expect(readCredentials(file, FILE_DEPS)).toEqual(credentials())
	})

	test("refuses a symlink, even a dangling one", () => {
		const { dir, file } = makeConfigDir()
		const target = join(dir, "elsewhere.json")
		writeFileSync(target, JSON.stringify(credentials()), { mode: 0o600 })
		symlinkSync(target, file)

		expect(() => readCredentials(file, FILE_DEPS)).toThrow("must be a regular file")
		rmSync(target)
		expect(() => readCredentials(file, FILE_DEPS)).toThrow("must be a regular file")
	})

	test("returns null when the file is absent", () => {
		const { file } = makeConfigDir()
		expect(readCredentials(file, FILE_DEPS)).toBeNull()
	})
})
