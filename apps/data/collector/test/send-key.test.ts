import { describe, expect, test } from "bun:test"
import { type KeyDeps, keyModeError, readIngestKey } from "../src/send/key"

const PATH = "/home/synthetic/.config/traj-data/ingest.key"

function deps(mode: number, text: string, onRead?: () => void): KeyDeps {
	return {
		modeOf: () => mode,
		readText: () => {
			onRead?.()
			return text
		},
	}
}

describe("keyModeError", () => {
	test("accepts owner-only modes", () => {
		expect(keyModeError(0o600)).toBeNull()
		expect(keyModeError(0o400)).toBeNull()
	})

	test("rejects group or world access", () => {
		expect(keyModeError(0o644)).not.toBeNull()
		expect(keyModeError(0o660)).not.toBeNull()
		expect(keyModeError(0o604)).not.toBeNull()
	})
})

describe("readIngestKey", () => {
	test("reads and trims an owner-only key", () => {
		expect(readIngestKey(PATH, deps(0o600, "  synthetic-key\n"))).toBe("synthetic-key")
	})

	test("refuses a group-readable key before reading it", () => {
		let read = false
		const file = deps(0o644, "synthetic-key", () => {
			read = true
		})
		expect(() => readIngestKey(PATH, file)).toThrow("chmod 600")
		expect(read).toBe(false)
	})

	test("refuses an empty key", () => {
		expect(() => readIngestKey(PATH, deps(0o600, "\n"))).toThrow("empty")
	})

	test("reports an unreadable file", () => {
		const file: KeyDeps = {
			modeOf: () => {
				throw new Error("synthetic")
			},
			readText: () => "",
		}
		expect(() => readIngestKey(PATH, file)).toThrow("cannot be read")
	})
})
