import { describe, expect, test } from "bun:test"
import {
	type CredentialDeps,
	type CredentialStat,
	credentialsPath,
	deleteCredentials,
	readCredentials,
	writeCredentials,
} from "../src/auth/credentials"
import { credentials } from "./support/auth"

const PATH = "/home/synthetic/.config/traj-data/credentials.json"
const OWNER_ONLY: CredentialStat = { isFile: true, isSymbolicLink: false, mode: 0o600 }

type Calls = {
	stats: number
	reads: number
	mkdirs: string[]
	writes: { path: string; text: string; mode: number }[]
	renames: { from: string; to: string }[]
	syncs: string[]
	removes: string[]
}

type Failures = {
	statError?: unknown
	readError?: unknown
	writeError?: unknown
	renameError?: unknown
	syncError?: unknown
	removeError?: unknown
}

function fakeDeps(options: { stat?: CredentialStat; text?: string; failures?: Failures } = {}) {
	const failures = options.failures ?? {}
	const calls: Calls = {
		stats: 0,
		reads: 0,
		mkdirs: [],
		writes: [],
		renames: [],
		syncs: [],
		removes: [],
	}
	const deps: CredentialDeps = {
		lstat: () => {
			calls.stats += 1
			if (failures.statError !== undefined) throw failures.statError
			return options.stat ?? OWNER_ONLY
		},
		readText: () => {
			calls.reads += 1
			if (failures.readError !== undefined) throw failures.readError
			return options.text ?? JSON.stringify(credentials())
		},
		mkdirPrivate: (path) => calls.mkdirs.push(path),
		writeExclusive: (path, text, mode) => {
			if (failures.writeError !== undefined) throw failures.writeError
			calls.writes.push({ path, text, mode })
		},
		rename: (from, to) => {
			if (failures.renameError !== undefined) throw failures.renameError
			calls.renames.push({ from, to })
		},
		syncDir: (path) => {
			if (failures.syncError !== undefined) throw failures.syncError
			calls.syncs.push(path)
		},
		remove: (path) => {
			if (failures.removeError !== undefined) throw failures.removeError
			calls.removes.push(path)
		},
	}
	return { calls, deps }
}

function coded(code: string): Error {
	return Object.assign(new Error(`synthetic ${code}`), { code })
}

describe("credentialsPath", () => {
	test("lives beside the hosts file", () => {
		expect(credentialsPath("/home/synthetic")).toBe(PATH)
	})
})

describe("readCredentials", () => {
	test("refuses a file group or others can read, before reading it", () => {
		for (const mode of [0o644, 0o640, 0o604, 0o660, 0o602]) {
			const { calls, deps } = fakeDeps({ stat: { ...OWNER_ONLY, mode } })
			expect(() => readCredentials(PATH, deps)).toThrow("chmod 600")
			expect(calls.reads).toBe(0)
		}
	})

	test("reads owner-only credentials", () => {
		const { deps } = fakeDeps()
		expect(readCredentials(PATH, deps)).toEqual(credentials())
	})

	test("returns null only when the path does not exist", () => {
		const missing = fakeDeps({ failures: { statError: coded("ENOENT") } })
		expect(readCredentials(PATH, missing.deps)).toBeNull()
		for (const code of ["EACCES", "ENOTDIR", "ELOOP"]) {
			const { deps } = fakeDeps({ failures: { statError: coded(code) } })
			expect(() => readCredentials(PATH, deps)).toThrow(`cannot be read: synthetic ${code}`)
		}
	})

	test("refuses a symlink or anything that is not a regular file", () => {
		for (const stat of [
			{ ...OWNER_ONLY, isSymbolicLink: true },
			{ ...OWNER_ONLY, isFile: false },
		]) {
			const { calls, deps } = fakeDeps({ stat })
			expect(() => readCredentials(PATH, deps)).toThrow("must be a regular file")
			expect(calls.reads).toBe(0)
		}
	})

	test("throws when the file cannot be read", () => {
		const { deps } = fakeDeps({ failures: { readError: coded("EACCES") } })
		expect(() => readCredentials(PATH, deps)).toThrow("cannot be read: synthetic EACCES")
	})

	test("throws on bad JSON and on a bad shape", () => {
		expect(() => readCredentials(PATH, fakeDeps({ text: "{" }).deps)).toThrow("not valid JSON")
		const shape = JSON.stringify({ ...credentials(), refreshToken: "" })
		expect(() => readCredentials(PATH, fakeDeps({ text: shape }).deps)).toThrow("malformed")
	})
})

describe("writeCredentials", () => {
	test("writes a mode-600 temporary file, renames it and syncs the directory", () => {
		const { calls, deps } = fakeDeps()
		writeCredentials(PATH, credentials(), deps)

		expect(calls.mkdirs).toEqual(["/home/synthetic/.config/traj-data"])
		expect(calls.writes).toHaveLength(1)
		const write = calls.writes[0]!
		expect(write.path.startsWith(`${PATH}.tmp-`)).toBe(true)
		expect(write.mode).toBe(0o600)
		expect(JSON.parse(write.text)).toEqual(credentials())
		expect(calls.renames).toEqual([{ from: write.path, to: PATH }])
		expect(calls.syncs).toEqual(["/home/synthetic/.config/traj-data"])
		expect(calls.removes).toEqual([])
	})

	test("deletes the temporary file when the write fails", () => {
		const { calls, deps } = fakeDeps({
			failures: { writeError: new Error("synthetic disk full") },
		})
		expect(() => writeCredentials(PATH, credentials(), deps)).toThrow("synthetic disk full")
		expect(calls.writes).toEqual([])
		expect(calls.removes).toHaveLength(1)
		expect(calls.removes[0]!.startsWith(`${PATH}.tmp-`)).toBe(true)
		expect(calls.renames).toEqual([])
	})

	test("deletes the temporary file when the rename fails", () => {
		const { calls, deps } = fakeDeps({
			failures: { renameError: new Error("synthetic rename failure") },
		})
		expect(() => writeCredentials(PATH, credentials(), deps)).toThrow("synthetic rename failure")
		expect(calls.removes).toEqual([calls.writes[0]!.path])
		expect(calls.syncs).toEqual([])
	})

	test("deletes the temporary file when the directory sync fails", () => {
		const { calls, deps } = fakeDeps({
			failures: { syncError: new Error("synthetic sync failure") },
		})
		expect(() => writeCredentials(PATH, credentials(), deps)).toThrow("synthetic sync failure")
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
