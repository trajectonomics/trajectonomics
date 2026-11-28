import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { EDIT_TOKEN_HEADER } from "../src/lib/edit/guard"
import { editRequest, getRequest, PARAMS, PORT, TOKEN } from "./edit-request.test-support"
import { makeScratch, removeScratch } from "./scratch"
import { runEdit } from "./serve-apply"
import { createEditor } from "./serve-edit"

const COPY = JSON.stringify({ kind: "copy-plan", from: "base", name: "early" })

/** An editor whose traj never runs: every test here is refused before a write, or before a read. */
function editor() {
	return createEditor({
		traj: { binary: "/nonexistent/traj" },
		cliVersion: "0.0.0",
		params: PARAMS,
		records: [],
		token: TOKEN,
	})
}

async function refusedWith(response: Response): Promise<{ status: number; code: string }> {
	const body = (await response.json()) as { ok: false; error: { code: string } }
	expect(body.ok).toBe(false)
	return { status: response.status, code: body.error.code }
}

describe("GET /edit-session", () => {
	test("answers the token to this machine, never cached and never readable across origins", async () => {
		const response = editor().session(getRequest("/edit-session"), PORT)
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ token: TOKEN })
		expect(response.headers.get("cache-control")).toBe("no-store")
		expect(response.headers.get("access-control-allow-origin")).toBeNull()
		expect(response.headers.get("cross-origin-resource-policy")).toBe("same-origin")
	})

	test("refuses a bad Host, and the token is not in the refusal", async () => {
		const response = editor().session(getRequest("/edit-session", "evil.example:4321"), PORT)
		expect(response.status).toBe(403)
		expect(await response.text()).not.toContain(TOKEN)
	})
})

describe("POST /edit refusals", () => {
	test("refuses a bad Host", async () => {
		const response = editor().edit(editRequest({ host: "evil.example:4321" }, COPY), PORT)
		expect(await refusedWith(await response)).toEqual({ status: 403, code: "bad_host" })
	})

	test("refuses an Origin other than this server's own", async () => {
		const response = editor().edit(editRequest({ origin: "http://evil.example" }, COPY), PORT)
		expect(await refusedWith(await response)).toEqual({ status: 403, code: "bad_origin" })
	})

	test("refuses a missing token header", async () => {
		const response = editor().edit(editRequest({ [EDIT_TOKEN_HEADER]: null }, COPY), PORT)
		expect(await refusedWith(await response)).toEqual({ status: 403, code: "bad_token" })
	})

	test("refuses a wrong token header", async () => {
		const response = editor().edit(editRequest({ [EDIT_TOKEN_HEADER]: "guess" }, COPY), PORT)
		expect(await refusedWith(await response)).toEqual({ status: 403, code: "bad_token" })
	})

	test("refuses a Content-Type other than application/json", async () => {
		const response = editor().edit(editRequest({ "content-type": "text/plain" }, COPY), PORT)
		expect(await refusedWith(await response)).toEqual({
			status: 415,
			code: "unsupported_media_type",
		})
	})

	test("refuses an Edit before the first Snapshot is read", async () => {
		const response = editor().edit(editRequest({}, COPY), PORT)
		expect(await refusedWith(await response)).toEqual({ status: 503, code: "not_ready" })
	})

	test("refuses a GET of the Edit path", async () => {
		const response = await editor().edit(getRequest("/edit"), PORT)
		expect(response.status).toBe(405)
	})
})

describe("POST /reread refusals", () => {
	test("refuses a wrong token, as an Edit does", async () => {
		const response = editor().reread(editRequest({ [EDIT_TOKEN_HEADER]: "guess" }, "{}"), PORT)
		expect(await refusedWith(await response)).toEqual({ status: 403, code: "bad_token" })
	})

	test("refuses a bad Host", async () => {
		const response = editor().reread(editRequest({ host: "evil.example:4321" }, "{}"), PORT)
		expect(await refusedWith(await response)).toEqual({ status: 403, code: "bad_host" })
	})

	test("refuses a reread before the first Snapshot is read", async () => {
		const response = editor().reread(editRequest({}, "{}"), PORT)
		expect(await refusedWith(await response)).toEqual({ status: 503, code: "not_ready" })
	})
})

describe("a new plan from the ledger's accounts", () => {
	test("is the template write, dry then real, with no read before them", async () => {
		const scratch = await makeScratch("traj-web-new-plan-")
		try {
			const calls = join(scratch, "calls")
			// A stand-in for traj that records each call and answers as a write that created the plan.
			const script = `echo "$*" >>"$CALLS"; echo '{"status":"created"}'`
			const context = { binary: "/bin/sh", prefix: ["-c", script, "traj"], env: { CALLS: calls } }
			const template = { asOf: "2026-10-31" }
			const run = await runEdit(context, { kind: "apply-plan", name: "fresh", template })
			expect(run).toEqual({ ok: true, replaced: false, droppedAnchors: [], droppedOwners: [] })
			const write = "scenario apply fresh --template --as-of 2026-10-31"
			expect((await Bun.file(calls).text()).trim().split("\n")).toEqual([
				`${write} --dry-run --json`,
				`${write} --json`,
			])
		} finally {
			await removeScratch(scratch)
		}
	})
})
