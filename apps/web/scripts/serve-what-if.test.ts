// POST /what-if: the guards it shares with POST /edit (each refusal has its own test here), the closed body,
// one at a time, and a what-if run against the real traj: its reads carry the Overrides and nothing is written,
// and the Edits that keep a what-if are checked against the ledger.
import { afterAll, describe, expect, test } from "bun:test"
import { EDIT_TOKEN_HEADER } from "../src/lib/edit/guard"
import { disposeEditor, SLOW_MS, setupEditor } from "./edit-fixture.test-support"
import { editRequest, PARAMS, PORT, TOKEN } from "./edit-request.test-support"
import { createEditor } from "./serve-edit"

/** A what-if that switches off `car`, the demo ledger's Flow that nothing else reads. */
const GOOD = JSON.stringify({ plan: "base", sets: [], removals: ["flows.car"] })

/** An editor whose traj never runs: every case here is refused before a read. */
function unreadyEditor() {
	return createEditor({
		traj: { binary: "/nonexistent/traj" },
		cliVersion: "0.0.0",
		params: PARAMS,
		records: [],
		token: TOKEN,
	})
}

/** The status and code of a refusal, which every refusal answers as the error envelope. */
async function refused(response: Response): Promise<{ status: number; code: string }> {
	const body = (await response.json()) as { ok: false; error: { code: string } }
	expect(body.ok).toBe(false)
	return { status: response.status, code: body.error.code }
}

describe("POST /what-if refusals: the guards it shares with POST /edit", () => {
	test("refuses a bad Host", async () => {
		const response = unreadyEditor().whatIf(editRequest({ host: "evil.example:4321" }, GOOD), PORT)
		expect(await refused(await response)).toEqual({ status: 403, code: "bad_host" })
	})

	test("refuses an Origin other than this server's own, a missing one included", async () => {
		const other = unreadyEditor().whatIf(editRequest({ origin: "http://evil.example" }, GOOD), PORT)
		expect(await refused(await other)).toEqual({ status: 403, code: "bad_origin" })
		const missing = unreadyEditor().whatIf(editRequest({ origin: null }, GOOD), PORT)
		expect(await refused(await missing)).toEqual({ status: 403, code: "bad_origin" })
	})

	test("refuses a missing token and a wrong token", async () => {
		const missing = unreadyEditor().whatIf(editRequest({ [EDIT_TOKEN_HEADER]: null }, GOOD), PORT)
		expect(await refused(await missing)).toEqual({ status: 403, code: "bad_token" })
		const wrong = unreadyEditor().whatIf(editRequest({ [EDIT_TOKEN_HEADER]: "guess" }, GOOD), PORT)
		expect(await refused(await wrong)).toEqual({ status: 403, code: "bad_token" })
	})

	test("refuses a Content-Type other than application/json", async () => {
		const response = unreadyEditor().whatIf(
			editRequest({ "content-type": "text/plain" }, GOOD),
			PORT,
		)
		expect(await refused(await response)).toEqual({ status: 415, code: "unsupported_media_type" })
	})

	test("refuses a what-if before the first Snapshot is read", async () => {
		const response = unreadyEditor().whatIf(editRequest({}, GOOD), PORT)
		expect(await refused(await response)).toEqual({ status: 503, code: "not_ready" })
	})

	test("refuses a GET of the path", async () => {
		const request = new Request(`http://127.0.0.1:${PORT}/what-if`, {
			headers: { host: `127.0.0.1:${PORT}` },
		})
		expect((await unreadyEditor().whatIf(request, PORT)).status).toBe(405)
	})
})

describe("POST /what-if body refusals: the closed shape, refused before anything runs", () => {
	const bodies: [string, string][] = [
		["a body that is not JSON", "{"],
		["a plan that starts with -", JSON.stringify({ plan: "-h", sets: [], removals: [] })],
		["a plan with a control character", JSON.stringify({ plan: "a\nb", sets: [], removals: [] })],
		[
			"a plan over 100 characters",
			JSON.stringify({ plan: "x".repeat(101), sets: [], removals: [] }),
		],
		["a removal of a whole list", JSON.stringify({ plan: "base", sets: [], removals: ["flows"] })],
		["a removal that is a flag", JSON.stringify({ plan: "base", sets: [], removals: ["--help"] })],
		[
			"a Set path that starts with -",
			JSON.stringify({ plan: "base", sets: [{ path: "-x", value: 1 }], removals: [] }),
		],
		[
			"a Set path that holds =",
			JSON.stringify({ plan: "base", sets: [{ path: "a=b", value: 1 }], removals: [] }),
		],
		["an unknown field", JSON.stringify({ plan: "base", sets: [], removals: [], write: true })],
		["a missing list", JSON.stringify({ plan: "base", sets: [] })],
	]
	for (const [label, body] of bodies) {
		test(
			`refuses ${label} with 400 invalid_what_if`,
			async () => {
				const editor = await setupEditor()
				const response = await editor.whatIf(editRequest({}, body), PORT)
				expect(await refused(response)).toEqual({ status: 400, code: "invalid_what_if" })
			},
			SLOW_MS,
		)
	}
})

afterAll(async () => {
	await disposeEditor()
})
