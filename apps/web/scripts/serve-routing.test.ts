// The loopback server's own routing, over a real Bun.serve on port 0: /edit and /edit-session reach the editor,
// the Origin check compares against the port the server bound, and every other path is answered by the pack
// ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { join } from "node:path"
import { EDIT_TOKEN_HEADER } from "../src/lib/edit/guard"
import { demoCarryIn } from "./demo/carry-in"
import { buildDemoLedger } from "./demo-ledger"
import { BINARY, SLOW_MS } from "./edit-fixture.test-support"
import { PARAMS } from "./edit-request.test-support"
import { makeScratch, removeScratch } from "./scratch"
import { startDashboard } from "./serve"

let scratch = ""
let stop: (() => Promise<void>) | null = null
let base = ""
let token = ""

/** The headers the page sends an Edit with, its Origin being the address the server bound. */
function pageHeaders(): Record<string, string> {
	return { "content-type": "application/json", origin: base, [EDIT_TOKEN_HEADER]: token }
}

beforeAll(async () => {
	scratch = await makeScratch("traj-web-routing-")
	const home = join(scratch, "traj-home")
	await buildDemoLedger({ binary: BINARY, home, scratch })
	const running = await startDashboard({
		traj: { binary: BINARY, env: { ...process.env, TRAJ_HOME: home, DO_NOT_TRACK: "1" } },
		cliVersion: "test",
		params: { ...PARAMS, scenarios: ["base"], carryIn: true },
		records: demoCarryIn(["base"]),
		port: 0,
	})
	if (!running.ok) throw new Error(running.error.message)
	stop = running.server.stop
	base = running.server.url.replace(/\/$/, "")
	const session = (await (await fetch(`${base}/edit-session`)).json()) as { token: string }
	token = session.token
}, SLOW_MS)

afterAll(async () => {
	if (stop !== null) await stop()
	if (scratch !== "") await removeScratch(scratch)
})

describe("the loopback server's routing", () => {
	test("GET /edit-session reaches the session answer", async () => {
		const response = await fetch(`${base}/edit-session`)
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ token })
		expect(response.headers.get("cache-control")).toBe("no-store")
	})

	test("POST /edit reaches the Edit answer", async () => {
		const response = await fetch(`${base}/edit`, {
			method: "POST",
			headers: pageHeaders(),
			body: JSON.stringify({ kind: "copy-plan", from: "no-such-plan", name: "routing-copy" }),
		})
		expect(response.status).toBe(200)
		const answer = (await response.json()) as { ok: boolean; error?: { code: string } }
		expect(answer.ok).toBe(false)
		expect(answer.error?.code).toBe("not_found")
	})

	test("the Origin check is the port the server bound, not another one", async () => {
		const response = await fetch(`${base}/edit`, {
			method: "POST",
			headers: { ...pageHeaders(), origin: "http://127.0.0.1:1" },
			body: JSON.stringify({ kind: "copy-plan", from: "base", name: "routing-origin" }),
		})
		expect(response.status).toBe(403)
		const answer = (await response.json()) as { error: { code: string } }
		expect(answer.error.code).toBe("bad_origin")
	})

	test("an unknown path is answered as the pack answers it", async () => {
		const response = await fetch(`${base}/no-such-page`)
		expect(response.status).toBe(404)
		expect(await response.text()).toBe("Not found")
		expect(response.headers.get("cache-control")).toBe("no-store")
	})
})
