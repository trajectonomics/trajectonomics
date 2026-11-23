// A save over a plan that changed since the page read it (cli ADR 0055), against the real traj: the
// refusal writes nothing, and a read again makes the same Edit succeed.
import { afterAll, describe, expect, test } from "bun:test"
import {
	BINARY,
	disposeEditor,
	hashOf,
	ledgerHome,
	ledgerShow,
	postEdit,
	SLOW_MS,
	setupEditor,
	shownOf,
	withAmount,
} from "./edit-fixture.test-support"
import { editRequest } from "./edit-request.test-support"

/** `traj scenario tax base --none` in the scratch ledger, as someone at a terminal would run it. */
function removeLevyInTerminal(): void {
	const run = Bun.spawnSync([BINARY, "scenario", "tax", "base", "--none", "--json"], {
		env: { ...process.env, TRAJ_HOME: ledgerHome() },
	})
	if (run.exitCode !== 0) throw new Error(run.stderr.toString())
}

/** A change to the plan's salary made from a terminal: `scenario apply --decimal`, as a person would run it. */
function changeSalaryInTerminal(amount: string): void {
	const document = withAmount(ledgerShow("base", true).scenario.document, "salary", amount)
	const run = Bun.spawnSync(
		[BINARY, "scenario", "apply", "base", "--file", "-", "--decimal", "--json"],
		{
			env: { ...process.env, TRAJ_HOME: ledgerHome() },
			stdin: new TextEncoder().encode(JSON.stringify(document)),
		},
	)
	if (run.exitCode !== 0) throw new Error(run.stderr.toString())
}

/** The Snapshot the page is serving now, as the server answers it. */
async function servedDocument(name: string) {
	const editor = await setupEditor()
	return shownOf({ snapshot: JSON.parse(editor.body ?? "null") }, name)
}

describe("an Edit over a plan that changed since the page read it", () => {
	test(
		"the page's save is refused as changed, and the stored plan keeps the terminal's change",
		async () => {
			const read = await servedDocument("base")
			const hashBefore = read.scenario.contentHash
			removeLevyInTerminal()
			const stored = ledgerShow("base", true)
			expect(stored.scenario.contentHash).not.toBe(hashBefore)

			const document = withAmount(read.scenario.document, "salary", "9000.50")
			const { status, answer } = await postEdit(
				JSON.stringify({
					kind: "apply-plan",
					name: "base",
					contentHash: hashBefore,
					document,
				}),
			)
			expect(status).toBe(200)
			expect(answer.ok).toBe(false)
			if (!answer.ok) {
				expect(answer.error.code).toBe("scenario_changed")
				expect(answer.error.message).toBeTruthy()
			}
			expect(ledgerShow("base", true)).toEqual(stored)
		},
		SLOW_MS,
	)

	test(
		"a household save over the same stale hash is refused too, and changes nothing",
		async () => {
			const stale = hashOf("base")
			changeSalaryInTerminal("8000.00")
			expect(hashOf("base")).not.toBe(stale)
			const before = ledgerShow("base", true)
			const { status, answer } = await postEdit(
				JSON.stringify({
					kind: "remove-household",
					name: "base",
					contentHash: stale,
				}),
			)
			expect(status).toBe(200)
			expect(answer.ok).toBe(false)
			if (!answer.ok) expect(answer.error.code).toBe("scenario_changed")
			expect(ledgerShow("base", true)).toEqual(before)
		},
		SLOW_MS,
	)

	test(
		"reading the Snapshot again shows the terminal's change, and the same Edit then succeeds",
		async () => {
			const editor = await setupEditor()
			const reread = await editor.reread(editRequest({}, "{}"), 4321)
			expect(reread.status).toBe(200)
			const answer = (await reread.json()) as {
				ok: boolean
				snapshot: unknown
			}
			expect(answer.ok).toBe(true)
			const fresh = shownOf({ snapshot: answer.snapshot }, "base")
			expect(fresh.scenario.contentHash).toBe(hashOf("base"))

			const document = withAmount(fresh.scenario.document, "salary", "9000.50")
			const saved = await postEdit(
				JSON.stringify({
					kind: "apply-plan",
					name: "base",
					contentHash: fresh.scenario.contentHash,
					document,
				}),
			)
			expect(saved.status).toBe(200)
			if (!saved.answer.ok) throw new Error(saved.answer.error.message)
			expect(
				ledgerShow("base", true).scenario.document.flows.find((f) => f.id === "salary")?.amount,
			).toBe("9000.50")
		},
		SLOW_MS,
	)
})

afterAll(disposeEditor)
