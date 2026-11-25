import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { STALE_PLAN } from "../client/edit.svelte"
import { STALE_PLAN as hostedStale } from "./edit-session.svelte"
import { OVERRIDES } from "./overrides"

// The hosted build swaps a closed list of modules for twins, and the twins are the only difference between its
// sources and the loopback build's (web ADR 0028). These tests pin the list, and pin that the hosted build has no
// way to send a request that carries a figure: every file that can is on the list.
const SRC = join(import.meta.dir, "..")
const files = (pattern: string): string[] =>
	[...new Bun.Glob(pattern).scanSync({ cwd: SRC })]
		.filter((file) => !/\.test(-support)?\.ts$/.test(file) && !file.startsWith("hosted/"))
		.sort()
/** A file's code: its comments (which may name a path in prose) are left out. */
const read = (file: string): string =>
	readFileSync(join(SRC, file), "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "")

/** Network and storage-of-requests calls: any file that holds one is a way for a figure to leave the page. */
const NETWORK = /\b(fetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource)/
/** The names of the loopback server's write path. */
const WRITE_PATH = /\b(EDIT_PATH|EDIT_SESSION_PATH|REREAD_PATH|WHAT_IF_PATH|EDIT_TOKEN_HEADER)\b/

describe("the closed list of hosted twins", () => {
	test("names a file under src/ and a twin in src/hosted/ for every entry", () => {
		for (const [original, twin] of Object.entries(OVERRIDES)) {
			expect(existsSync(join(SRC, original)), original).toBe(true)
			expect(existsSync(join(SRC, "hosted", twin)), twin).toBe(true)
		}
		expect(new Set(Object.values(OVERRIDES)).size).toBe(Object.keys(OVERRIDES).length)
	})

	test("has a twin for every file that calls the network, except the one that reads the Demo snapshot", () => {
		const callers = files("**/*.{ts,svelte}").filter((file) => NETWORK.test(read(file)))
		expect(callers.filter((file) => OVERRIDES[file] === undefined)).toEqual(["client/browser.ts"])
	})

	test("has a twin for every file that names the loopback server's write path", () => {
		const naming = files("**/*.{ts,svelte}")
			.filter((file) => WRITE_PATH.test(read(file)))
			.filter((file) => file !== "lib/edit/guard.ts" && !file.startsWith("lib/serve/"))
		expect(naming.filter((file) => OVERRIDES[file] === undefined)).toEqual([])
	})

	test("holds no network call and no write path name in any twin, in the fence or in the notice", () => {
		const own = [
			...[...new Bun.Glob("hosted/*.{ts,svelte}").scanSync({ cwd: SRC })].filter(
				(f) => !f.endsWith(".test.ts"),
			),
			"client/hosted-fence.ts",
			...[...new Bun.Glob("components/hosted/*").scanSync({ cwd: SRC })],
		]
		expect(own.length).toBeGreaterThan(10)
		for (const file of own) {
			expect(NETWORK.test(read(file)), `${file} calls the network`).toBe(false)
			expect(WRITE_PATH.test(read(file)), `${file} names the write path`).toBe(false)
		}
	})

	test("keeps the sentence of a plan that moved on the same as the loopback session's", () => {
		expect(hostedStale).toBe(STALE_PLAN)
	})

	test("exports from each twin every name its original exports", async () => {
		for (const [original, twin] of Object.entries(OVERRIDES)) {
			if (original.endsWith(".svelte")) continue
			const loopback = await import(join(SRC, original))
			const hosted = await import(join(SRC, "hosted", twin))
			const missing = Object.keys(loopback).filter((name) => !(name in hosted))
			expect(missing, `${relative(SRC, join(SRC, "hosted", twin))} lacks`).toEqual([])
		}
	})
})
