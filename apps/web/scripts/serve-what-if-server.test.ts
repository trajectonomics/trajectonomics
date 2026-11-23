// POST /what-if through the real loopback server (startDashboard), with its own fictional ledger: the 1 MiB body
// cap is the server's, refused before the body is read, and a good what-if answers 200 with the four reads.
import { afterAll, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { EDIT_TOKEN_HEADER } from "../src/lib/edit/guard"
import { demoCarryIn } from "./demo/carry-in"
import { buildDemoLedger } from "./demo-ledger"
import { BINARY, SLOW_MS } from "./edit-fixture.test-support"
import { PARAMS } from "./edit-request.test-support"
import { startDashboard } from "./serve"

let scratch = ""
let stop: (() => Promise<void>) | null = null

afterAll(async () => {
	if (stop !== null) await stop()
	if (scratch !== "") await rm(scratch, { recursive: true, force: true })
})

/** Starts the Dashboard on a free loopback port against a fresh fictional ledger, and returns its base URL and token. */
async function start(): Promise<{ base: string; token: string }> {
	if (stop !== null) await stop()
	stop = null
	if (scratch !== "") await rm(scratch, { recursive: true, force: true })
	scratch = await mkdtemp(join(tmpdir(), "traj-web-what-if-"))
	const home = join(scratch, "traj-home")
	await buildDemoLedger({ binary: BINARY, home, scratch })
	const running = await startDashboard({
		traj: { binary: BINARY, env: { ...process.env, TRAJ_HOME: home } },
		cliVersion: "test",
		params: { ...PARAMS, scenarios: ["base"], carryIn: true },
		records: demoCarryIn(["base"]),
		port: 0,
	})
	if (!running.ok) throw new Error(running.error.message)
	stop = running.server.stop
	const base = running.server.url.replace(/\/$/, "")
	const session = (await (await fetch(`${base}/edit-session`)).json()) as { token: string }
	return { base, token: session.token }
}

describe("POST /what-if on the real server", () => {
	test(
		"a body over 1 MiB is refused with 413 before it is read, and a good what-if answers 200",
		async () => {
			const { base, token } = await start()
			// The page's own origin, as its browser sends it: the Origin guard refuses a request without it.
			const headers = {
				"content-type": "application/json",
				origin: base,
				[EDIT_TOKEN_HEADER]: token,
			}
			const big = await fetch(`${base}/what-if`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					plan: "base",
					sets: [],
					removals: [],
					pad: "x".repeat(1024 * 1024 + 1),
				}),
			})
			expect(big.status).toBe(413)
			const good = await fetch(`${base}/what-if`, {
				method: "POST",
				headers,
				body: JSON.stringify({ plan: "base", sets: [], removals: ["flows.car"] }),
			})
			expect(good.status).toBe(200)
			expect(good.headers.get("cache-control")).toBe("no-store")
			const answer = (await good.json()) as { ok: true; reads: { projection: { ok: boolean } } }
			expect(answer.reads.projection.ok).toBe(true)
		},
		SLOW_MS,
	)

	test(
		"a what-if without the token is refused with 403, and nothing runs",
		async () => {
			const { base } = await start()
			const response = await fetch(`${base}/what-if`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: base, [EDIT_TOKEN_HEADER]: "guess" },
				body: JSON.stringify({ plan: "base", sets: [], removals: [] }),
			})
			expect(response.status).toBe(403)
		},
		SLOW_MS,
	)
})
