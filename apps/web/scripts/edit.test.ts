import { afterAll, describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { buildDemoLedger } from "./demo-ledger"
import { editRequest, PARAMS, TOKEN } from "./edit-request.test-support"
import { createEditor, type Editor } from "./serve-edit"

/** The workspace's own traj binary, built by `turbo run build --filter=@trajectonomics/cli`. */
const BINARY = fileURLToPath(new URL("../../cli/dist/traj", import.meta.url))
/** A fresh ledger built and written to against the real CLI takes a few seconds per Edit. */
const SLOW_MS = 180_000

type Answer =
	| {
			ok: true
			snapshot: { params: { scenarios: string[] }; reads: { projections: Record<string, unknown> } }
	  }
	| { ok: false; error: { code: string; message: string } }

let scratch = ""
let editor: Editor | null = null

/** The fictional ledger, built once for the file; each Edit writes to it through the real traj. */
async function setup(): Promise<Editor> {
	if (editor !== null) return editor
	scratch = await mkdtemp(join(tmpdir(), "traj-web-edit-"))
	const home = join(scratch, "traj-home")
	await buildDemoLedger({ binary: BINARY, home, scratch })
	const next = createEditor({
		traj: { binary: BINARY, env: { ...process.env, TRAJ_HOME: home } },
		cliVersion: "test",
		params: { ...PARAMS, scenarios: ["base"] },
		records: [],
		token: TOKEN,
	})
	const run = await next.refresh()
	if (!run.ok) throw new Error(`the first read failed: ${run.error.message}`)
	editor = next
	return next
}

async function post(body: string): Promise<{ status: number; answer: Answer }> {
	const response = await (await setup()).edit(editRequest({}, body), 4321)
	return { status: response.status, answer: (await response.json()) as Answer }
}

const copy = (name: string, from = "base") => JSON.stringify({ kind: "copy-plan", from, name })
const drop = (name: string) => JSON.stringify({ kind: "delete-plan", name })

describe("an Edit against the real traj", () => {
	test("the workspace traj binary is built", () => {
		expect(existsSync(BINARY)).toBe(true)
	})

	test(
		"copying a plan runs fork, and the new Snapshot shows the copy",
		async () => {
			const { status, answer } = await post(copy("e2e-copy"))
			expect(status).toBe(200)
			if (!answer.ok) throw new Error(answer.error.message)
			expect(answer.snapshot.params.scenarios).toEqual(["base", "e2e-copy"])
			expect(Object.keys(answer.snapshot.reads.projections)).toContain("e2e-copy")
		},
		SLOW_MS,
	)

	test(
		"a copy of a plan that does not exist answers the CLI's error as data, and changes nothing",
		async () => {
			const { status, answer } = await post(copy("e2e-missing", "no-such-plan"))
			expect(status).toBe(200)
			expect(answer.ok).toBe(false)
			if (!answer.ok) expect(answer.error.code).toBe("not_found")
			expect((await setup()).body).toContain('"scenarios":["base","e2e-copy"]')
		},
		SLOW_MS,
	)

	test(
		"a second Edit that arrives while one runs is refused with 409",
		async () => {
			const editing = await setup()
			const first = editing.edit(editRequest({}, copy("e2e-first")), 4321)
			const second = editing.edit(editRequest({}, copy("e2e-second")), 4321)
			const [one, two] = await Promise.all([first, second])
			expect(one.status).toBe(200)
			expect(two.status).toBe(409)
			expect(((await two.json()) as { error: { code: string } }).error.code).toBe("edit_running")
		},
		SLOW_MS,
	)

	test(
		"a body that is not an Edit of the list is refused with 400, before anything runs",
		async () => {
			const editing = await setup()
			const notEdit = await editing.edit(editRequest({}, '{"kind":"tx add"}'), 4321)
			expect(notEdit.status).toBe(400)
			const notJson = await editing.edit(editRequest({}, "not json"), 4321)
			expect(notJson.status).toBe(400)
			expect(((await notJson.json()) as { error: { code: string } }).error.code).toBe(
				"invalid_edit",
			)
		},
		SLOW_MS,
	)

	test(
		"applying a Scenario document runs apply --file - with the document on stdin",
		async () => {
			const template = Bun.spawnSync([BINARY, "scenario", "apply", "--template", "--json"])
			const document = JSON.parse(JSON.parse(template.stdout.toString()) as string) as Record<
				string,
				unknown
			>
			const { status, answer } = await post(
				JSON.stringify({ kind: "apply-plan", name: "e2e-applied", document }),
			)
			expect(status).toBe(200)
			if (!answer.ok) throw new Error(answer.error.message)
			expect(answer.snapshot.params.scenarios).toContain("e2e-applied")
		},
		SLOW_MS,
	)

	test(
		"deleting a plan runs rm, and the new Snapshot no longer names it",
		async () => {
			const { status, answer } = await post(drop("e2e-copy"))
			expect(status).toBe(200)
			if (!answer.ok) throw new Error(answer.error.message)
			expect(answer.snapshot.params.scenarios).not.toContain("e2e-copy")
		},
		SLOW_MS,
	)
})

afterAll(async () => {
	if (scratch !== "") await rm(scratch, { recursive: true, force: true })
})
