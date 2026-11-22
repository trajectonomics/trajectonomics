import { afterAll, describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import {
	BINARY,
	copy,
	disposeEditor,
	drop,
	ledgerShow,
	postEdit,
	SLOW_MS,
	setupEditor,
} from "./edit-fixture.test-support"
import { editRequest } from "./edit-request.test-support"

describe("an Edit against the real traj", () => {
	test("the workspace traj binary is built", () => {
		expect(existsSync(BINARY)).toBe(true)
	})

	test(
		"copying a plan runs fork, and the new Snapshot shows the copy",
		async () => {
			const { status, answer } = await postEdit(copy("e2e-copy"))
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
			const { status, answer } = await postEdit(copy("e2e-missing", "no-such-plan"))
			expect(status).toBe(200)
			expect(answer.ok).toBe(false)
			if (!answer.ok) expect(answer.error.code).toBe("not_found")
			expect((await setupEditor()).body).toContain('"scenarios":["base","e2e-copy"]')
		},
		SLOW_MS,
	)

	test(
		"a second Edit that arrives while one runs is refused with 409",
		async () => {
			const editing = await setupEditor()
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
			const editing = await setupEditor()
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
		"applying a decimal-form document creates the plan, and the ledger holds it in minor units",
		async () => {
			const document = ledgerShow("base", true).scenario.document
			const { status, answer } = await postEdit(
				JSON.stringify({ kind: "apply-plan", name: "e2e-applied", document }),
			)
			expect(status).toBe(200)
			if (!answer.ok) throw new Error(answer.error.message)
			expect(answer.snapshot.params.scenarios).toContain("e2e-applied")
			expect(ledgerShow("e2e-applied", false).scenario.document.flows[0]?.id).toBe("salary")
		},
		SLOW_MS,
	)

	test(
		"deleting a plan runs rm, and the new Snapshot no longer names it",
		async () => {
			const { status, answer } = await postEdit(drop("e2e-copy"))
			expect(status).toBe(200)
			if (!answer.ok) throw new Error(answer.error.message)
			expect(answer.snapshot.params.scenarios).not.toContain("e2e-copy")
		},
		SLOW_MS,
	)
})

afterAll(disposeEditor)
