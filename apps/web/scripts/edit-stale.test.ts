// A save over a plan that changed since the page read it (cli ADR 0055), against the real traj: the
// refusal writes nothing, and a read again makes the same Edit succeed.
import { afterAll, afterEach, describe, expect, test } from "bun:test"
import {
	BINARY,
	disposeEditor,
	hashOf,
	householdHashOf,
	ledgerHome,
	ledgerShow,
	postEdit,
	SLOW_MS,
	setupEditor,
	shownOf,
	withAmount,
} from "./edit-fixture.test-support"
import { editRequest } from "./edit-request.test-support"
import { settle } from "./editor-running.test-support"

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

/**
 * A household change made from a terminal: the holder's life expectancy moves, which writes no anchored
 * date, so the document and its contentHash stay as they were (cli ADR-0055).
 */
function changeLifeExpectancyInTerminal(age: number): void {
	const household = ledgerShow("base", false).scenario.household
	if (household === null) throw new Error("the scratch ledger has no household")
	const people = household.people.map((person) =>
		person.id === "me" ? { ...person, lifeExpectancy: age } : person,
	)
	const run = Bun.spawnSync([BINARY, "scenario", "household", "base", "--file", "-", "--json"], {
		env: { ...process.env, TRAJ_HOME: ledgerHome() },
		stdin: new TextEncoder().encode(JSON.stringify({ ...household, people })),
	})
	if (run.exitCode !== 0) throw new Error(run.stderr.toString())
}

/** The holder's life expectancy in the stored household. */
function holderLifeExpectancy(): number | undefined {
	return ledgerShow("base", false).scenario.household?.people.find((person) => person.id === "me")
		?.lifeExpectancy
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
			const stale = householdHashOf("base")
			changeSalaryInTerminal("8000.00")
			expect(householdHashOf("base")).not.toBe(stale)
			const before = ledgerShow("base", true)
			const { status, answer } = await postEdit(
				JSON.stringify({
					kind: "remove-household",
					name: "base",
					householdHash: stale,
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
		"a household change that moves no anchored date refuses the stale save, and a re-read lets it through",
		async () => {
			const editor = await setupEditor()
			const reread = await editor.reread(editRequest({}, "{}"), 4321)
			const page = (await reread.json()) as { ok: boolean; snapshot: unknown }
			if (!page.ok) throw new Error("the page could not read the plan")
			const read = shownOf({ snapshot: page.snapshot }, "base")
			const stale = read.scenario.householdHash
			changeLifeExpectancyInTerminal(95)
			const stored = ledgerShow("base", true)
			// The repro: no anchored date moved, so the document's contentHash did not move either.
			expect(stored.scenario.contentHash).toBe(read.scenario.contentHash)
			expect(stored.scenario.householdHash).not.toBe(stale)
			expect(holderLifeExpectancy()).toBe(95)

			const household = read.scenario.household
			if (household === null) throw new Error("the page's read has no household")
			const people = household.people.map((person) =>
				person.id === "me" ? { ...person, lifeExpectancy: 60 } : person,
			)
			const save = {
				kind: "set-household",
				name: "base",
				householdHash: stale,
				household: { ...household, people },
			}
			const refused = await postEdit(JSON.stringify(save))
			expect(refused.status).toBe(200)
			expect(refused.answer.ok).toBe(false)
			if (!refused.answer.ok) expect(refused.answer.error.code).toBe("scenario_changed")
			expect(holderLifeExpectancy()).toBe(95)

			// Read again: the same save over the fresh read's householdHash is the one that runs.
			const again = await editor.reread(editRequest({}, "{}"), 4321)
			const freshPage = (await again.json()) as { ok: boolean; snapshot: unknown }
			if (!freshPage.ok) throw new Error("the page could not read the plan")
			const fresh = shownOf({ snapshot: freshPage.snapshot }, "base")
			expect(fresh.scenario.householdHash).not.toBe(stale)
			const saved = await postEdit(
				JSON.stringify({ ...save, householdHash: fresh.scenario.householdHash }),
			)
			expect(saved.status).toBe(200)
			if (!saved.answer.ok) throw new Error(saved.answer.error.message)
			expect(holderLifeExpectancy()).toBe(60)
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

afterEach(settle, SLOW_MS)
afterAll(disposeEditor)
