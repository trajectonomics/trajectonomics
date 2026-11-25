import { describe, expect, test } from "bun:test"
import { scenarioDocument } from "../lib/contract"
import { employerOf } from "../lib/view/plan-items/employer"
import { employerDraftOf } from "../lib/view/plan-items/employer-draft"
import { planDocument } from "../lib/view/plan-items/fixtures.test-support"
import { type FlowDraft, flowDraftForTry } from "../lib/view/plan-items/flows"
import { shownPlan } from "../lib/what-if/routing"
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
			growth: "inflation",
		},
		{
			id: "side",
			kind: "income",
			frequency: "monthly",
			start: "2026-11-01",
			end: "2050-05-14",
			amount: "2000.00",
			earned: true,
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
const shownFlows = () =>
	whatIfSession.whatIf?.plan === "base" ? shownPlan(doc, whatIfSession.whatIf).flows : doc.flows
/** The draft as the drawer starts it: the session's view while a value is tried, as FlowForm does. */
const draftOf = (id: string, edit: Partial<FlowDraft>): FlowDraft => ({
	...flowDraftForTry(shownFlows(), id, stored(id)),
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

/** Tries the side income, with the employer share the form shows unless one is given. */
async function trySide(
	edit: Partial<FlowDraft>,
	employer = employerDraftOf(employerOf(shownFlows(), "side")),
): Promise<void> {
	const saved = await saveFlow({
		name: "base",
		contentHash: HASH,
		doc,
		kind: "income",
		existing: stored("side"),
		draft: draftOf("side", edit),
		employer,
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
		// The draft reads the stored end back, not the `end = start` the once try added only for `traj`.
		expect(living?.end).toBe("2050-05-14")
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

	test("an employer share the session added survives a try of its salary as once", async () => {
		await trySide({}, { account: "fund", share: "3", rounding: "floor" })
		await trySide({ frequency: "once" })
		const flows = shownFlows()
		const side = flows.find((flow) => flow.id === "side")
		const employer = employerOf(flows, "side")
		expect(employer?.percent).toBe("3.00")
		expect(employer?.flow.frequency).toBe("once")
		expect(employer?.flow.start).toBe(side?.start)
	})

	test("clearing the employer section removes the share the session added", async () => {
		await trySide({}, { account: "fund", share: "3", rounding: "floor" })
		await trySide({}, employerDraftOf(null))
		expect(whatIfSession.whatIf?.additions ?? []).toEqual([])
	})

	test("a try submitted with no edits leaves a switched-off Flow off", async () => {
		whatIfSession.setOff("base", HASH, "flows.living", true)
		await tryLiving({})
		expect(whatIfSession.isOffIn("base", "flows.living")).toBe(true)
	})
})
