// A home bought next year with a loan, kept, let and sold, against the real traj: its value comes back from the
// `balances` table, an edit to the running-cost share changes what the plan pays, and deleting it leaves the plan as
// it was (cli ADR 0060). The document is the one the form writes.
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"
import { balancesOf } from "../src/lib/view/plan-items/asset-chart"
import { assetDocument, realAssetById } from "../src/lib/view/plan-items/asset-document"
import { homeDraft } from "../src/lib/view/plan-items/asset-fixtures.test-support"
import { assetFromDraft } from "../src/lib/view/plan-items/asset-from-draft"
import { assetDraftOf } from "../src/lib/view/plan-items/asset-read"
import { withoutAsset } from "../src/lib/view/plan-items/asset-remove"
import {
	disposeLedger,
	documentOf,
	runOf,
	SLOW_MS,
	save,
	setupLedger,
} from "./loans-ledger.test-support"
import { settle } from "./loans-running.test-support"

const PLAN = "home-plan"
const EDIT = { isNew: false, ownedIds: [] }

beforeAll(() => setupLedger([PLAN]), SLOW_MS)
// A test that timed out leaves its Edit holding the server: wait for it, so it fails no test after it.
afterEach(settle, SLOW_MS)
afterAll(disposeLedger)

/** The cash flow line of an item in the first year of a run, as the CLI states it. */
function firstYear(run: ReturnType<typeof runOf>, id: string): string | undefined {
	const lines = run.tables.flatMap((table) => (table.name === "cashflow" ? table.rows : []))
	return lines.find((line) => line.index === 0 && line.id === id)?.amount
}

describe("a home on the Assets and debts page, against the real traj", () => {
	test(
		"adds a home bought next year with a loan, running costs and a sale, edits its running share, and deletes it",
		async () => {
			const before = documentOf(PLAN)
			const added = assetFromDraft(homeDraft(), {
				doc: before,
				check: { isNew: true, ownedIds: [] },
			})
			if (!added.ok) throw new Error(JSON.stringify(added.problems))
			const answer = await save(PLAN, assetDocument(before, added.parts, undefined))
			expect(answer.ok).toBe(true)
			const run = runOf(answer, PLAN)

			// Its value is read back from `balances`: worth something while kept, nothing once sold.
			const value = balancesOf(run, "home")
			expect(value.length).toBeGreaterThan(0)
			const kept = value.find((row) => row.date.startsWith("2029"))
			const sold = value.find((row) => row.date.startsWith("2031"))
			expect(Number(kept?.amount)).toBeGreaterThan(1_000_000)
			expect(sold?.amount).toBe("0.00")
			const owed = run.tables.flatMap((table) => (table.name === "paidOff" ? table.rows : []))
			expect(owed.find((row) => row.account === "home-loan")?.date).toBe("2030-07-15")

			// Editing the running-cost share changes what the plan pays, and nothing else about the item.
			const stored = documentOf(PLAN)
			const home = realAssetById(stored, "home")
			if (home === undefined) throw new Error("the home is not recognised")
			expect(home.outside).toEqual([])
			const draft = assetDraftOf(home.parts)
			const edited = assetFromDraft(
				{ ...draft, running: { ...draft.running, rate: "2.00" } },
				{ existing: home.parts, doc: stored, check: EDIT },
			)
			if (!edited.ok) throw new Error(JSON.stringify(edited.problems))
			const again = runOf(await save(PLAN, assetDocument(stored, edited.parts, home.parts)), PLAN)
			const once = Number(firstYear(run, "home-running"))
			const twice = Number(firstYear(again, "home-running"))
			expect(twice).toBeGreaterThan(once)
			expect(realAssetById(documentOf(PLAN), "home")?.parts.running?.derive).toMatchObject({
				measures: [{}, { num: 200, den: 120000 }],
			})

			// Deleting it leaves the plan as it was.
			const current = documentOf(PLAN)
			const parts = realAssetById(current, "home")?.parts
			if (parts === undefined) throw new Error("the home is gone")
			const removal = withoutAsset(current, parts, false)
			if (!removal.ok) throw new Error(removal.message)
			expect((await save(PLAN, removal.document)).ok).toBe(true)
			expect(documentOf(PLAN)).toEqual(before)
		},
		SLOW_MS,
	)
})
