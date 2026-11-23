// Trying the estate block as a what-if against the real traj (cli ADR 0064, web ADR 0014): one Set of the whole block,
// nothing written, and a plan with no block cannot be tried because `traj` replaces a path the plan holds.
import { afterAll, beforeAll, describe, expect } from "bun:test"
import { householdDocument } from "../src/lib/contract"
import { blockFromDraft, estateDates, estateView } from "../src/lib/view/estate"
import { failedReads } from "../src/lib/what-if/answer"
import { readsOf } from "../src/lib/what-if/lens"
import { overridesOf, startWhatIf } from "../src/lib/what-if/session"
import { withTriedEstate } from "../src/lib/what-if/try-estate"
import { SLOW_MS } from "./edit-fixture.test-support"
import { slow, typedLines, withoutLines, withSavedLines } from "./estate.test-support"
import {
	disposeEstate,
	HOUSEHOLD,
	PLAN,
	setupEstate,
	storedPlan,
	tryWhatIf,
} from "./estate-ledger.test-support"

beforeAll(async () => {
	await setupEstate()
}, SLOW_MS)
afterAll(disposeEstate)

/** Tries a draft as the form does: the block as one Set, read through the what-if route. */
async function tryDraft(settlement: string, gift: string) {
	const made = blockFromDraft(typedLines(settlement, gift))
	if (!made.ok) throw new Error(JSON.stringify(made.problems))
	const session = withTriedEstate(startWhatIf(PLAN, storedPlan().hash), made.block)
	return { session, answer: await tryWhatIf({ plan: PLAN, ...overridesOf(session) }) }
}

describe("trying the estate block", () => {
	slow(
		"a 2% settlement share is one Set of the block: 2% of 1,391,400.00 is 27,828.00, and nothing is written",
		async () => {
			await withSavedLines()
			const before = storedPlan()
			const { session, answer } = await tryDraft("2", "5")
			expect(session.sets.map((set) => set.path)).toEqual(["estate"])
			const { run } = readsOf(answer)
			if (run === null) throw new Error("the what-if has a run")
			const dates = estateDates(run, before.document, householdDocument.parse(HOUSEHOLD), "")
			// The net is 1,391,400.00 - 184,000.00 - 27,828.00 = 1,179,572.00; 5% of it is 58,978.60.
			expect(estateView(run, dates?.chosen.date ?? "", "both")?.figures.row).toMatchObject({
				costs: "27828.00",
				net: "1179572.00",
				gifts: "58978.60",
				toHeirs: "1120593.40",
			})
			expect(storedPlan()).toEqual(before)
		},
	)

	slow("a block with no line is tried as an empty one, which states no cost", async () => {
		await withSavedLines()
		const session = withTriedEstate(startWhatIf(PLAN, storedPlan().hash), null)
		const answer = await tryWhatIf({ plan: PLAN, ...overridesOf(session) })
		const { run } = readsOf(answer)
		if (run === null) throw new Error("the what-if has a run")
		const view = estateView(run, "2028-12-31", "both")
		expect(view?.figures.row).toMatchObject({ costs: "0.00", gifts: "0.00", toHeirs: "1207400.00" })
	})

	slow(
		"a plan with no block is tried as a new block (cli ADR 0065), and nothing is written",
		async () => {
			await withoutLines()
			const before = storedPlan()
			expect(before.document.estate).toBeUndefined()
			const { session, answer } = await tryDraft("1", "5")
			expect(failedReads(answer)).toEqual([])
			expect(session.sets.map((set) => set.path)).toEqual(["estate"])
			const { run } = readsOf(answer)
			if (run === null) throw new Error("the what-if has a run")
			const dates = estateDates(run, before.document, householdDocument.parse(HOUSEHOLD), "")
			// 1% of 1,391,400.00 is 13,914.00; the net 1,391,400.00 - 184,000.00 - 13,914.00 = 1,193,486.00;
			// 5% of it is 59,674.30, so heirs receive 1,133,811.70.
			expect(estateView(run, dates?.chosen.date ?? "", "both")?.figures.row).toMatchObject({
				costs: "13914.00",
				net: "1193486.00",
				gifts: "59674.30",
				toHeirs: "1133811.70",
			})
			expect(storedPlan()).toEqual(before)
		},
	)
})
