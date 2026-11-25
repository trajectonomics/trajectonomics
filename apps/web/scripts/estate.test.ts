// Saving the estate block and reading it back, against the real traj (cli ADR 0064, web ADR 0014). Each test saves or
// clears the lines it needs first, so any of them passes when run alone. The plan is worked by hand: no interest, no
// inflation, the bank and the fund hold 1,398,900.00 at the start, the gym takes 100.00 a month, and the car loan owes
// 184,000.00 throughout; the household's one person reaches the life expectancy of 38 in 2028.
import { afterAll, afterEach, beforeAll, describe, expect } from "bun:test"
import { householdDocument } from "../src/lib/contract"
import { estateDates, estateView } from "../src/lib/view/estate"
import { SLOW_MS } from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"
import {
	runOf,
	saveDraft,
	slow,
	typedLines,
	withoutLines,
	withSavedLines,
} from "./estate.test-support"
import {
	disposeEstate,
	HOUSEHOLD,
	post,
	setupEstate,
	storedPlan,
} from "./estate-ledger.test-support"

beforeAll(async () => {
	await setupEstate()
}, SLOW_MS)
afterEach(settle, SLOW_MS)
afterAll(disposeEstate)

/** The page's own reading of the stored plan and its run on a choice of date. */
function read(run: Parameters<typeof estateDates>[0], at: string) {
	const { document } = storedPlan()
	const dates = estateDates(run, document, householdDocument.parse(HOUSEHOLD), at)
	if (dates === null) throw new Error("the run states no estate")
	return { dates, view: estateView(run, dates.chosen.date, "both") }
}

describe("the estate block, saved and read back", () => {
	slow(
		"a plan with no line states the gross estate less the debts: 1,391,400.00 less 184,000.00 is 1,207,400.00",
		async () => {
			const run = await withoutLines()
			const { dates, view } = read(run, "")
			expect(dates.chosen).toMatchObject({ value: "life", date: "2028-12-31" })
			expect(view?.figures.date).toBe("2029-01-01")
			expect(view?.figures.row).toMatchObject({
				gross: "1391400.00",
				debts: "184000.00",
				costs: "0.00",
				net: "1207400.00",
				gifts: "0.00",
				toHeirs: "1207400.00",
			})
			expect(storedPlan().document.estate).toBeUndefined()
		},
	)

	slow(
		"a 1% settlement share and a 5% gift save as typed, are read back as percent strings, and state the heirs' share: 1,133,811.70",
		async () => {
			await withoutLines()
			const answer = await saveDraft(typedLines())
			expect(answer.ok).toBe(true)
			expect(storedPlan().document.estate).toEqual({
				costs: [{ id: "settlement", of: "gross", bps: "1.00", rounding: "halfUp" }],
				gifts: [{ id: "temple", of: "net", bps: "5.00", rounding: "halfUp" }],
			})
			// 1% of 1,391,400.00 is 13,914.00; the net is 1,391,400.00 - 184,000.00 - 13,914.00 = 1,193,486.00;
			// 5% of that is 59,674.30, so heirs receive 1,193,486.00 - 59,674.30 = 1,133,811.70.
			const { view } = read(runOf(answer), "")
			expect(view?.figures.row).toMatchObject({
				gross: "1391400.00",
				debts: "184000.00",
				costs: "13914.00",
				net: "1193486.00",
				gifts: "59674.30",
				toHeirs: "1133811.70",
				realToHeirs: "1133811.70",
			})
			expect(view?.figures.costs.map((one) => [one.label, one.amount])).toEqual([
				["settlement", "13914.00"],
			])
			expect(view?.figures.gifts.map((one) => [one.label, one.amount])).toEqual([
				["temple", "59674.30"],
			])
		},
	)

	slow(
		"the date changed to a Milestone reads the first roll-up end after it: the retire Milestone, 1 June 2027, reads 1 January 2028",
		async () => {
			const run = await withSavedLines()
			const { dates, view } = read(run, "milestone:retire")
			expect(dates.chosen.date).toBe("2027-06-01")
			// 1% of 1,392,600.00 is 13,926.00; net 1,392,600.00 - 184,000.00 - 13,926.00 = 1,194,674.00; 5% is 59,733.70.
			expect(view?.figures.row).toMatchObject({
				date: "2028-01-01",
				costs: "13926.00",
				net: "1194674.00",
				gifts: "59733.70",
				toHeirs: "1134940.30",
			})
		},
	)

	slow("removing the lines leaves the plan as it was before any was added", async () => {
		await withoutLines()
		const before = storedPlan()
		const saved = await saveDraft(typedLines())
		expect(saved.ok).toBe(true)
		expect(storedPlan().hash).not.toBe(before.hash)
		const removed = await saveDraft({ costs: [], gifts: [] })
		expect(removed.ok).toBe(true)
		expect(storedPlan().document).toEqual(before.document)
		expect(storedPlan().hash).toBe(before.hash)
		expect((await post("reread", {})).ok).toBe(true)
	})
})
