// A write that lands while the Snapshot read that answers it fails (#211, #750): the answer says the change was
// saved (`written_reread_failed`), never the read's own error, and the whole body served to the page is the old one
// until Reload reads the write ([ADR 0008](../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { accountValues, scenarioList } from "../src/lib/contract"
import { WRITTEN_REREAD_FAILED, WRITTEN_REREAD_FAILED_MESSAGE } from "../src/lib/edit/failure"
import { demoCarryIn } from "./demo/carry-in"
import { copyDemoLedger } from "./demo-ledger.test-support"
import { BINARY, SLOW_MS } from "./edit-fixture.test-support"
import { editRequest, getRequest, PARAMS, PORT, TOKEN } from "./edit-request.test-support"
import { makeScratch, removeScratch } from "./scratch"
import { createEditor, type Editor } from "./serve-edit"

/**
 * A `traj` around the workspace binary whose writes pass and whose reads fail while the marker file exists, as a
 * ledger that is busy for a read after a write is: the dry run and the real write go through, the Snapshot read
 * after them answers `database_busy`.
 */
const FAIL_READS = `
if [ "$1" = "scenario" ] && [ "$2" = "fork" ]; then exec "$TRAJ_REAL" "$@"; fi
if [ "$1" = "account" ] && [ "$2" = "value" ]; then exec "$TRAJ_REAL" "$@"; fi
if [ -f "$TRAJ_FAIL_READS" ]; then
	printf '%s' '{"error":{"code":"database_busy","exitCode":3,"message":"The ledger is busy."}}' >&2
	exit 3
fi
exec "$TRAJ_REAL" "$@"
`

let scratch = ""
let home = ""
let marker = ""
let editor: Editor | null = null

/** The plans the ledger stores, read through the workspace binary itself. */
function ledgerNames(): string[] {
	const run = Bun.spawnSync([BINARY, "scenario", "list", "--json"], {
		env: { ...process.env, TRAJ_HOME: home, DO_NOT_TRACK: "1" },
	})
	return scenarioList.parse(JSON.parse(run.stdout.toString())).scenarios.map((plan) => plan.name)
}

/** An account's id by its name, from the Snapshot the page is served. */
function idOf(name: string): string {
	if (editor === null) throw new Error("no editor")
	const body = JSON.parse(editor.body ?? "null") as {
		reads: { accounts: { data: { accounts: { id: string; name: string }[] } } }
	}
	const found = body.reads.accounts.data.accounts.find((account) => account.name === name)
	if (found === undefined) throw new Error(`no account ${name}`)
	return found.id
}

beforeAll(async () => {
	scratch = await makeScratch("traj-web-written-")
	home = join(scratch, "traj-home")
	marker = join(scratch, "fail-reads")
	await copyDemoLedger({ binary: BINARY, home, scratch })
	const made = createEditor({
		traj: {
			binary: "/bin/sh",
			prefix: ["-c", FAIL_READS, "traj"],
			env: {
				...process.env,
				DO_NOT_TRACK: "1",
				TRAJ_HOME: home,
				TRAJ_REAL: BINARY,
				TRAJ_FAIL_READS: marker,
			},
		},
		cliVersion: "test",
		params: { ...PARAMS, scenarios: ["base"], carryIn: true },
		records: demoCarryIn(["base"]),
		token: TOKEN,
	})
	const first = await made.refresh()
	if (!first.ok) throw new Error(first.error.message)
	editor = made
}, SLOW_MS)

afterAll(async () => {
	if (scratch !== "") await removeScratch(scratch)
})

describe("a write that landed while its answer is an error", () => {
	test(
		"a copy answers written_reread_failed, the ledger holds it and the body does not, and Reload reads it",
		async () => {
			const editing = editor
			if (editing === null) throw new Error("no editor")
			await writeFile(marker, "")
			const answer = await editing.edit(
				editRequest({}, JSON.stringify({ kind: "copy-plan", from: "base", name: "saved-unread" })),
				4321,
			)
			expect(answer.status).toBe(200)
			const body = (await answer.json()) as {
				ok: boolean
				error?: { code: string; exitCode: number; message: string }
			}
			expect(body.ok).toBe(false)
			expect(body.error).toEqual({
				code: WRITTEN_REREAD_FAILED,
				exitCode: 1,
				message: WRITTEN_REREAD_FAILED_MESSAGE,
			})
			// The write landed, while the body the page is served with is the Snapshot from before it.
			expect(ledgerNames()).toContain("saved-unread")
			expect(editing.body).not.toContain("saved-unread")
			// The Reload the notice offers is a reread: it reads again and serves the plan the write made.
			await rm(marker, { force: true })
			const reread = await editing.reread(editRequest({}, "{}"), 4321)
			expect(reread.status).toBe(200)
			expect(editing.body).toContain("saved-unread")
		},
		SLOW_MS,
	)

	test(
		"a record-values batch answers written_reread_failed with its result, and a reread reads the ledger",
		async () => {
			const editing = editor
			if (editing === null) throw new Error("no editor")
			await writeFile(marker, "")
			const answer = await editing.edit(
				editRequest(
					{},
					JSON.stringify({
						kind: "record-values",
						against: idOf("Fund Return"),
						values: [{ account: idOf("Bank"), date: "2026-10-31", value: "777777.00" }],
					}),
				),
				4321,
			)
			expect(answer.status).toBe(200)
			const body = (await answer.json()) as {
				ok: boolean
				error?: { code: string; exitCode: number; message: string }
				result?: unknown
			}
			expect(body.ok).toBe(false)
			expect(body.error).toEqual({
				code: WRITTEN_REREAD_FAILED,
				exitCode: 1,
				message: WRITTEN_REREAD_FAILED_MESSAGE,
			})
			expect(accountValues.parse(body.result).counts.added).toBe(1)
			const session = await editing.session(getRequest("/edit-session"), PORT).json()
			expect(session).toEqual({ token: TOKEN, unread: true })
			await rm(marker, { force: true })
			const reread = await editing.reread(editRequest({}, "{}"), 4321)
			expect(reread.status).toBe(200)
			expect(((await reread.json()) as { ok: boolean }).ok).toBe(true)
		},
		SLOW_MS,
	)

	test(
		"a reread after a landed write whose read failed reads the whole Snapshot, even with the allowances cleared",
		async () => {
			const editing = editor
			if (editing === null) throw new Error("no editor")
			await writeFile(marker, "")
			const answer = await editing.edit(
				editRequest({}, JSON.stringify({ kind: "copy-plan", from: "base", name: "saved-behind" })),
				4321,
			)
			expect(((await answer.json()) as { ok: boolean }).ok).toBe(false)
			expect(ledgerNames()).toContain("saved-behind")
			await rm(marker, { force: true })
			expect(editing.body).not.toContain("saved-behind")
			// Clearing the allowance inputs runs no read: the reread would answer the Snapshot held from before the write.
			const reread = await editing.reread(
				editRequest({}, JSON.stringify({ allowances: null })),
				4321,
			)
			expect(reread.status).toBe(200)
			expect(editing.body).toContain("saved-behind")
		},
		SLOW_MS,
	)

	test(
		"the session says unread, for a page loaded again, from a landed write until a whole read succeeds",
		async () => {
			const editing = editor
			if (editing === null) throw new Error("no editor")
			const session = () => editing.session(getRequest("/edit-session"), PORT).json()
			const reread = () => editing.reread(editRequest({}, "{}"), PORT)
			await writeFile(marker, "")
			// A read that fails with no write before it is not a saved change.
			await reread()
			expect(await session()).toEqual({ token: TOKEN })
			const copy = { kind: "copy-plan", from: "base", name: "saved-session" }
			await editing.edit(editRequest({}, JSON.stringify(copy)), PORT)
			expect(await session()).toEqual({ token: TOKEN, unread: true })
			await reread()
			expect(await session()).toEqual({ token: TOKEN, unread: true })
			await rm(marker, { force: true })
			await reread()
			expect(await session()).toEqual({ token: TOKEN })
		},
		SLOW_MS,
	)
})
