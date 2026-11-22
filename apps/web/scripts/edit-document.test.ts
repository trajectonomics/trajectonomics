import { afterAll, describe, expect, test } from "bun:test"
import {
	BINARY,
	copy,
	disposeEditor,
	ledgerHome,
	ledgerShow,
	postEdit,
	SLOW_MS,
	shownOf,
	withAmount,
} from "./edit-fixture.test-support"

describe("saving a Flow of a plan's document, against the real traj", () => {
	test(
		"a changed amount runs apply --decimal: the Snapshot shows 9000.50, and the ledger holds 900050",
		async () => {
			const copied = await postEdit(copy("e2e-edit"))
			if (!copied.answer.ok) throw new Error(copied.answer.error.message)
			const before = shownOf(copied.answer, "e2e-edit")
			const document = withAmount(before.scenario.document, "salary", "9000.50")
			const { status, answer } = await postEdit(
				JSON.stringify({ kind: "apply-plan", name: "e2e-edit", document }),
			)
			expect(status).toBe(200)
			if (!answer.ok) throw new Error(answer.error.message)
			const after = shownOf(answer, "e2e-edit")
			expect(after.scenario.document.flows.find((flow) => flow.id === "salary")?.amount).toBe(
				"9000.50",
			)
			const stored = ledgerShow("e2e-edit", false) as unknown as {
				scenario: { document: { flows: { id: string; amount: number }[] } }
			}
			expect(stored.scenario.document.flows.find((flow) => flow.id === "salary")?.amount).toBe(
				900050,
			)
		},
		SLOW_MS,
	)

	test(
		"saving a document that changed nothing leaves the plan unchanged: same hash, same version",
		async () => {
			const copied = await postEdit(copy("e2e-same"))
			if (!copied.answer.ok) throw new Error(copied.answer.error.message)
			const before = shownOf(copied.answer, "e2e-same")
			const { status, answer } = await postEdit(
				JSON.stringify({
					kind: "apply-plan",
					name: "e2e-same",
					document: before.scenario.document,
				}),
			)
			expect(status).toBe(200)
			if (!answer.ok) throw new Error(answer.error.message)
			const after = shownOf(answer, "e2e-same")
			expect(after.scenario.contentHash).toBe(before.scenario.contentHash)
			expect(after.scenario.version).toBe(before.scenario.version)
			const direct = Bun.spawnSync(
				[BINARY, "scenario", "apply", "e2e-same", "--file", "-", "--decimal", "--json"],
				{
					env: { ...process.env, TRAJ_HOME: ledgerHome() },
					stdin: new TextEncoder().encode(JSON.stringify(before.scenario.document)),
				},
			)
			expect((JSON.parse(direct.stdout.toString()) as { status: string }).status).toBe("unchanged")
		},
		SLOW_MS,
	)

	test(
		"a refused amount answers the CLI's error with the path of its field, and changes nothing",
		async () => {
			const copied = await postEdit(copy("e2e-refused"))
			if (!copied.answer.ok) throw new Error(copied.answer.error.message)
			const before = shownOf(copied.answer, "e2e-refused")
			const document = withAmount(before.scenario.document, "salary", "9000.501")
			const { status, answer } = await postEdit(
				JSON.stringify({ kind: "apply-plan", name: "e2e-refused", document }),
			)
			expect(status).toBe(200)
			expect(answer.ok).toBe(false)
			if (answer.ok) return
			expect(answer.error.code).toBe("INVALID_AMOUNT")
			expect(answer.error.path).toBe("document.flows.salary.amount")
			expect(ledgerShow("e2e-refused", true).scenario.contentHash).toBe(before.scenario.contentHash)
		},
		SLOW_MS,
	)
})

afterAll(disposeEditor)
