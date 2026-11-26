// A try that adds a field the stored Flow lacks is one Set of the whole Flow, as an Account's try is (issue #638;
// cli ADR 0024, 0062, 0065). The session is read through POST /what-if as the page reads it, and the figures are the plan's
// own with the field stored: traj takes the whole-item Set, and the lens shows the added field.
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"
import type { ProjectionRun } from "../src/lib/contract"
import { lensReadsOf } from "../src/lib/what-if/lens"
import { lensDocument } from "../src/lib/what-if/lens-document"
import { overridesOf, recordOf, startWhatIf, withTriedFields } from "../src/lib/what-if/session"
import { SLOW_MS } from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"
import { disposeWithdrawals, setupWithdrawals, storedPlan } from "./withdrawals-ledger.test-support"
import { post, tryWhatIf } from "./withdrawals-requests.test-support"

const PLAN = "spend"
const GYM = "gym"

beforeAll(async () => {
	await setupWithdrawals()
}, SLOW_MS)
afterAll(disposeWithdrawals)
afterEach(settle, SLOW_MS)

const slow = (name: string, run: () => Promise<void>) => test(name, run, SLOW_MS)

/** The plan's gym as the page tries it, with one field its stored Flow lacks. */
function tried(field: string, value: string) {
	const gym = storedPlan().document.flows.find((flow) => flow.id === GYM)
	if (gym === undefined) throw new Error("the plan has a gym")
	const stored = recordOf(gym)
	return { stored, edited: { ...stored, [field]: value } }
}

/** The money a run states: its annual roll-up, its cash-flow totals and its tax years. */
function moneyOf(run: ProjectionRun) {
	return {
		annual: run.tables.find((table) => table.name === "annual"),
		totals: run.tables.find((table) => table.name === "cashflowTotals"),
		taxYears: run.taxYears,
	}
}

/** The plan's own projection through the what-if's argv, and the control for a try that changes no figure. */
async function planRun(): Promise<ProjectionRun> {
	const lens = lensReadsOf(await tryWhatIf({ plan: PLAN, sets: [], removals: [] }))
	if (lens.run === null) throw new Error("the plan's own what-if run was refused")
	return lens.run
}

/** Saves the tried Flow in the plan, so its end is the plan's own rather than an Override. */
async function saveEnd(edited: Record<string, unknown>): Promise<void> {
	const before = storedPlan()
	const document = {
		...before.document,
		flows: before.document.flows.map((flow) => (flow.id === GYM ? edited : flow)),
	}
	const answer = await post("edit", {
		kind: "apply-plan",
		name: PLAN,
		contentHash: before.hash,
		document,
	})
	expect(answer.ok).toBe(true)
}

describe("a try that adds a field the stored Flow lacks", () => {
	for (const [field, value] of [
		["category", "fitness"],
		["displayLabel", "Gym"],
		["end", "2027-04-30"],
	] as const) {
		slow(`a first ${field} is one Set of the whole Flow, and traj takes it`, async () => {
			const before = storedPlan()
			const { stored, edited } = tried(field, value)
			const session = withTriedFields(startWhatIf(PLAN, before.hash), "flows", GYM, stored, edited)
			expect(session.sets).toEqual([{ path: `flows.${GYM}`, value: edited }])
			// The session's view shows the added field, so the drawer's next try starts from it.
			expect(
				lensDocument(before.document, overridesOf(session)).flows.find((flow) => flow.id === GYM),
			).toMatchObject({ [field]: value })
			const lens = lensReadsOf(await tryWhatIf({ plan: PLAN, ...overridesOf(session) }))
			if (lens.run === null) throw new Error(`traj refused the first ${field}`)
			expect(lens.run.overrides).toEqual([{ path: `flows.${GYM}`, value: edited }])
			const money = moneyOf(lens.run)
			if (field === "end") {
				// An end stops the payments, and the plan with the end saved gives the same figures.
				expect(money).not.toEqual(moneyOf(await planRun()))
				await saveEnd(edited)
				expect(money).toEqual(moneyOf(await planRun()))
			} else {
				// A category and a label name the Flow and change no figure.
				expect(money).toEqual(moneyOf(await planRun()))
			}
		})
	}
})
