import { describe, expect, test } from "bun:test"
import { scenarioDocument } from "../lib/contract"
import { employerDraftOf } from "../lib/view/plan-items/employer-draft"
import { planDocument } from "../lib/view/plan-items/fixtures.test-support"
import { flowFormStart } from "../lib/view/plan-items/flow-try-draft"
import { saveFlow } from "./flow-save.js"
import { whatIfSession } from "./what-if.svelte.js"
import { HASH, useSessionHooks } from "./what-if.test-support"

useSessionHooks()

const base = planDocument()
const doc = scenarioDocument.parse({
	...base,
	accounts: [...base.accounts, { id: "fund", kind: "asset", rate: 300 }],
	flows: [
		...base.flows,
		{
			id: "living",
			kind: "expense",
			frequency: "monthly",
			start: "2026-11-01",
			end: "2050-05-14",
			amount: "28000.00",
			growth: "inflation",
			category: "home",
		},
	],
})
const salary = doc.flows.find((flow) => flow.id === "salary")
const living = doc.flows.find((flow) => flow.id === "living")
const SPEC = {
	kind: "salary" as const,
	name: "salary",
	paths: ["flows.salary", "flows.salary-employer"],
}

describe("a try with no edit on a switched-off Flow", () => {
	test("keeps a salary's tried end and added share, which its form shows without an edit", async () => {
		const form = flowFormStart(doc, "base", salary, true, whatIfSession.whatIf)
		const first = await saveFlow({
			name: "base",
			contentHash: HASH,
			doc,
			kind: "income",
			existing: salary,
			draft: { ...form.draft, end: "2030-12-31" },
			employer: { account: "fund", share: "7", rounding: "floor" },
			tryValue: true,
		})
		expect(first.done).toBe(true)
		expect(whatIfSession.whatIf?.sets).toEqual([{ path: "flows.salary.end", value: "2030-12-31" }])
		expect(whatIfSession.whatIf?.additions).toHaveLength(1)
		whatIfSession.setGroupOff("base", HASH, SPEC, SPEC.paths, true)
		// The form reads the stored salary's dates and the share the session added, so the draft differs from the try.
		const again = flowFormStart(doc, "base", salary, true, whatIfSession.whatIf)
		expect(again.employer.share).toBe("7.00")
		const saved = await saveFlow({
			name: "base",
			contentHash: HASH,
			doc,
			kind: "income",
			existing: salary,
			draft: again.draft,
			employer: again.employer,
			tryValue: true,
		})
		expect(saved.done).toBe(true)
		expect(saved.cleared).toEqual([])
		expect(whatIfSession.isOffIn("base", "flows.salary")).toBe(true)
		expect(whatIfSession.whatIf?.sets).toEqual([{ path: "flows.salary.end", value: "2030-12-31" }])
		expect(whatIfSession.whatIf?.additions).toHaveLength(1)
	})

	test("keeps a salary's added share when its try edits only the amount", async () => {
		const form = flowFormStart(doc, "base", salary, true, whatIfSession.whatIf)
		const first = await saveFlow({
			name: "base",
			contentHash: HASH,
			doc,
			kind: "income",
			existing: salary,
			draft: form.draft,
			employer: { account: "fund", share: "7", rounding: "floor" },
			tryValue: true,
		})
		expect(first.done).toBe(true)
		whatIfSession.setGroupOff("base", HASH, SPEC, SPEC.paths, true)
		const again = flowFormStart(doc, "base", salary, true, whatIfSession.whatIf)
		const saved = await saveFlow({
			name: "base",
			contentHash: HASH,
			doc,
			kind: "income",
			existing: salary,
			draft: { ...again.draft, amount: "123456.00" },
			employer: again.employer,
			tryValue: true,
		})
		// The edit switches the salary and its share back on, and the share the session added is still tried.
		expect(saved.done).toBe(true)
		expect(whatIfSession.isOffIn("base", "flows.salary")).toBe(false)
		expect(whatIfSession.whatIf?.sets).toContainEqual({
			path: "flows.salary.amount",
			value: "123456.00",
		})
		expect(whatIfSession.whatIf?.additions).toHaveLength(1)
		expect(whatIfSession.whatIf?.additions[0]?.item).toMatchObject({ id: "salary-employer" })
	})

	test("keeps a held try when the form clears one field and nothing else", async () => {
		const form = flowFormStart(doc, "base", living, true, whatIfSession.whatIf)
		const first = await saveFlow({
			name: "base",
			contentHash: HASH,
			doc,
			kind: "expense",
			existing: living,
			draft: { ...form.draft, amount: "31000.00" },
			employer: employerDraftOf(null),
			tryValue: true,
		})
		expect(first.done).toBe(true)
		whatIfSession.setOff("base", HASH, "flows.living", true)
		const again = flowFormStart(doc, "base", living, true, whatIfSession.whatIf)
		const saved = await saveFlow({
			name: "base",
			contentHash: HASH,
			doc,
			kind: "expense",
			existing: living,
			draft: { ...again.draft, category: "" },
			employer: employerDraftOf(null),
			tryValue: true,
		})
		// The notice shows why the cleared category was not tried, and the Flow stays off with its try held.
		expect(saved.done).toBe(false)
		expect(saved.cleared).toEqual(["category"])
		expect(whatIfSession.isOffIn("base", "flows.living")).toBe(true)
		expect(whatIfSession.whatIf?.sets).toEqual([{ path: "flows.living.amount", value: "31000.00" }])
	})
})
