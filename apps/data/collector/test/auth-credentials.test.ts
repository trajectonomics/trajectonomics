import { describe, expect, test } from "bun:test"
import {
	type CredentialDeps,
	credentialsPath,
	deleteCredentials,
	readCredentials,
	writeCredentials,
} from "../src/auth/credentials"
import { credentials } from "./support/auth"

const PATH = "/home/synthetic/.config/traj-data/credentials.json"

type Calls = {
	modes: number
	reads: number
	mkdirs: string[]
	writes: { path: string; text: string; mode: number }[]
	renames: { from: string; to: string }[]
	removes: string[]
}

function fakeDeps(options: { mode?: number; text?: string; present?: boolean } = {}) {
	const calls: Calls = { modes: 0, reads: 0, mkdirs: [], writes: [], renames: [], removes: [] }
	const deps: CredentialDeps = {
		modeOf: () => {
			calls.modes += 1
			return options.mode ?? 0o600
		},
		readText: () => {
			calls.reads += 1
			return options.text ?? JSON.stringify(credentials())
		},
		exists: () => options.present ?? true,
		mkdirPrivate: (path) => calls.mkdirs.push(path),
		writeExclusive: (path, text, mode) => calls.writes.push({ path, text, mode }),
		rename: (from, to) => calls.renames.push({ from, to }),
		remove: (path) => calls.removes.push(path),
	}
	return { calls, deps }
}

describe("credentialsPath", () => {
	test("lives beside the hosts file", () => {
		expect(credentialsPath("/home/synthetic")).toBe(PATH)
	})
})

describe("readCredentials", () => {
	test("refuses a file group or others can read, before reading it", () => {
		for (const mode of [0o644, 0o640]) {
			const { calls, deps } = fakeDeps({ mode })
			expect(() => readCredentials(PATH, deps)).toThrow("chmod 600")
			expect(calls.reads).toBe(0)
		}
	})

	test("reads owner-only credentials", () => {
		const { deps } = fakeDeps()
		expect(readCredentials(PATH, deps)).toEqual(credentials())
	})

	test("returns null when the file does not exist", () => {
		const { calls, deps } = fakeDeps({ present: false })
		expect(readCredentials(PATH, deps)).toBeNull()
		expect(calls.modes).toBe(0)
	})

	test("throws on bad JSON and on a bad shape", () => {
		expect(() => readCredentials(PATH, fakeDeps({ text: "{" }).deps)).toThrow("not valid JSON")
		const shape = JSON.stringify({ ...credentials(), refreshToken: "" })
		expect(() => readCredentials(PATH, fakeDeps({ text: shape }).deps)).toThrow("malformed")
	})
})

describe("writeCredentials", () => {
	test("writes a mode-600 temporary file and renames it into place", () => {
		const { calls, deps } = fakeDeps()
		writeCredentials(PATH, credentials(), deps)

		expect(calls.mkdirs).toEqual(["/home/synthetic/.config/traj-data"])
		expect(calls.writes).toHaveLength(1)
		const write = calls.writes[0]!
		expect(write.path.startsWith(`${PATH}.tmp-`)).toBe(true)
		expect(write.mode).toBe(0o600)
		expect(JSON.parse(write.text)).toEqual(credentials())
		expect(calls.renames).toEqual([{ from: write.path, to: PATH }])
		expect(calls.removes).toEqual([])
	})

	test("deletes the temporary file when the rename fails", () => {
		const { calls, deps } = fakeDeps()
		const failing: CredentialDeps = {
			...deps,
			rename: () => {
				throw new Error("synthetic rename failure")
			},
		}
		expect(() => writeCredentials(PATH, credentials(), failing)).toThrow("synthetic rename failure")
		expect(calls.removes).toEqual([calls.writes[0]!.path])
	})
})

describe("deleteCredentials", () => {
	test("removes the file", () => {
		const { calls, deps } = fakeDeps()
		deleteCredentials(PATH, deps)
		expect(calls.removes).toEqual([PATH])
	})
})
