import { describe, expect, test } from "bun:test"
import { scenarioDocument } from "../lib/contract"
import { employerOf } from "../lib/view/plan-items/employer"
import { employerDraftOf } from "../lib/view/plan-items/employer-draft"
import { planDocument } from "../lib/view/plan-items/fixtures.test-support"
import { type FlowDraft, flowDraftOf } from "../lib/view/plan-items/flows"
import { lensDocument, NO_CHANGES } from "../lib/what-if/lens-document"
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
			amount: "30000.00",
		},
		{
			id: "salary-employer",
			kind: "contribution",
			target: "fund",
			funding: "employer",
			frequency: "monthly",
			start: "2026-11-01",
			end: "2050-05-14",
			derive: {
				measures: [
					{ id: "pay", op: "flow", flow: "salary" },
					{ id: "share", op: "scale", of: "pay", num: 500, den: 10000, rounding: "floor" },
				],
				result: "share",
			},
		},
	],
})
const stored = (id: string) => doc.flows.find((flow) => flow.id === id)
const shownFlows = () => lensDocument(doc, whatIfSession.changesFor("base") ?? NO_CHANGES).flows
/** The Flow as the drawer starts it: the session's view while a value is tried, as FlowForm does. */
const shownFlow = (id: string) => shownFlows().find((flow) => flow.id === id) ?? stored(id)
const draftOf = (id: string, edit: Partial<FlowDraft>): FlowDraft => ({
	...flowDraftOf(shownFlow(id)),
	...edit,
})

/** Tries the living expense from the session's view, as a second visit to the drawer does. */
async function tryLiving(edit: Partial<FlowDraft>): Promise<void> {
	const saved = await saveFlow({
		name: "base",
		contentHash: HASH,
		doc,
		kind: "expense",
		existing: stored("living"),
		draft: draftOf("living", edit),
		employer: employerDraftOf(null),
		tryValue: true,
	})
	expect(saved.problems).toEqual({})
	expect(saved.done).toBe(true)
}

/** Tries the salary, with the employer share the form shows unless one is typed, from the session's view. */
async function trySalary(edit: Partial<FlowDraft>, share?: string): Promise<void> {
	const employer = employerDraftOf(employerOf(shownFlows(), "salary"))
	const saved = await saveFlow({
		name: "base",
		contentHash: HASH,
		doc,
		kind: "income",
		existing: stored("salary"),
		draft: draftOf("salary", edit),
		employer: share === undefined ? employer : { ...employer, share },
		tryValue: true,
	})
	expect(saved.problems).toEqual({})
	expect(saved.done).toBe(true)
}

describe("a second try on a Flow starts from the session", () => {
	test("a monthly Flow tried once, then a new start alone, puts its once end on the new start", async () => {
		await tryLiving({ frequency: "once" })
		await tryLiving({ start: "2027-02-01" })
		const living = shownFlows().find((flow) => flow.id === "living")
		expect(living?.frequency).toBe("once")
		expect(living?.start).toBe("2027-02-01")
		// `traj` accepts a once Flow only when its end is its start (END_BEFORE_START, ONCE_FLOW_END_MISMATCH).
		expect(living?.end).toBe("2027-02-01")
	})

	test("a Flow tried once and then monthly drops the once change", async () => {
		await tryLiving({ frequency: "once" })
		await tryLiving({ frequency: "monthly" })
		const living = shownFlows().find((flow) => flow.id === "living")
		expect(living?.frequency).toBe("monthly")
		// The Ends field the draft now shows holds the session's end, which the first try put on the start.
		expect(living?.end).toBe("2026-11-01")
	})

	test("a salary tried once keeps its employer's share on a second try of the amount alone", async () => {
		await trySalary({ frequency: "once" }, "7")
		await trySalary({ amount: "95000.00" })
		const flows = shownFlows()
		const salary = flows.find((flow) => flow.id === "salary")
		const employer = employerOf(flows, "salary")
		expect(salary?.frequency).toBe("once")
		expect(employer?.percent).toBe("7.00")
		// The employer's Flow lands when the salary does, so it stays once on the same date.
		expect(employer?.flow.frequency).toBe("once")
		expect(employer?.flow.start).toBe(salary?.start)
	})
})
