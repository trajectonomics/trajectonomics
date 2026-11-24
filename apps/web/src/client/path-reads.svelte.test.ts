import { afterEach, describe, expect, test } from "bun:test"
import { chanceWithOutcomes, pathFixture } from "../lib/view/chance/futures.test-support"
import { BUSY_WAITS_MS, PathReads } from "./path-reads.svelte.js"

const realFetch = globalThis.fetch
afterEach(() => {
	globalThis.fetch = realFetch
})

const refusal = (code: string, message: string) => ({
	ok: false,
	error: { code, exitCode: 1, message },
})
const RUNNING = refusal("edit_running", "Another Edit is running. Wait for it.")
const READ = { ok: true, path: { argv: [], ok: true, data: pathFixture(1) } }

/** A server that answers each ask with the next of `answers` (a status and a body), and counts them. */
function serve(...answers: [number, unknown][]): { asked: () => number } {
	let asked = 0
	globalThis.fetch = (() => {
		const [status, body] = answers[Math.min(asked, answers.length - 1)] ?? [500, {}]
		asked++
		return Promise.resolve(new Response(JSON.stringify(body), { status }))
	}) as unknown as typeof fetch
	return { asked: () => asked }
}

/** A reads store whose waits are recorded and take no time. */
function reads(): { reads: PathReads; waits: number[] } {
	const waits: number[] = []
	return { reads: new PathReads((ms) => Promise.resolve(void waits.push(ms))), waits }
}

const run = JSON.stringify(chanceWithOutcomes().definition)

describe("a live future read while the server is busy", () => {
	test("asks again, with growing waits, when an Edit is running, and shows the future once the server answers", async () => {
		const server = serve([409, RUNNING], [409, RUNNING], [200, READ])
		const { reads: store, waits } = reads()
		await store.load("token", "base", 1, run)
		expect(server.asked()).toBe(3)
		expect(waits).toEqual([1000, 2000])
		expect(store.entry("base", 1)).toMatchObject({ run, status: "done" })
	})

	test("waits at least ten seconds in all before it gives up, and then says the Dashboard is busy", async () => {
		const server = serve([409, RUNNING])
		const { reads: store, waits } = reads()
		await store.load("token", "base", 1, run)
		expect(server.asked()).toBe(BUSY_WAITS_MS.length + 1)
		expect(waits).toEqual([...BUSY_WAITS_MS])
		expect(waits.reduce((sum, ms) => sum + ms, 0)).toBeGreaterThanOrEqual(10_000)
		expect(store.entry("base", 1)).toMatchObject({ status: "failed" })
		const entry = store.entry("base", 1)
		expect(entry?.status === "failed" && entry.message).toContain("busy with an Edit")
	})

	test("shows the server's own sentence for any other 409, and does not ask again", async () => {
		const sentence = "The chance on screen drew 200 Market paths. Reload the Dashboard."
		const server = serve([409, refusal("chance_changed", sentence)])
		const { reads: store, waits } = reads()
		await store.load("token", "base", 1, run)
		expect(server.asked()).toBe(1)
		expect(waits).toEqual([])
		expect(store.entry("base", 1)).toEqual({ run, status: "failed", message: sentence })
	})
})
