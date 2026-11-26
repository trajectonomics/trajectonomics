import { describe, expect, test } from "bun:test"
import { scenarioDocument } from "../lib/contract"
import { employerOf } from "../lib/view/plan-items/employer"
import type { EmployerDraft } from "../lib/view/plan-items/employer-draft"
import { employerDraftOf } from "../lib/view/plan-items/employer-draft"
import { planDocument } from "../lib/view/plan-items/fixtures.test-support"
import { flowFormStart } from "../lib/view/plan-items/flow-try-draft"
import type { FlowDraft } from "../lib/view/plan-items/flows"
import { salaryFromDraft } from "../lib/view/plan-items/salary-draft"
import { shownFlows } from "../lib/what-if/routing"
import { type GroupSpec, overridesOf } from "../lib/what-if/session"
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
const salary = doc.flows.find((flow) => flow.id === "salary")
if (salary === undefined) throw new Error("the fixture has a salary")
const SPEC: GroupSpec = {
	kind: "salary",
	name: "salary",
	paths: ["flows.salary", "flows.salary-employer"],
}

/** Switches the salary and its employer share off together, as the card does. */
function switchOff(): void {
	whatIfSession.setGroupOff("base", HASH, SPEC, SPEC.paths, true)
}

/** The form a try starts from, as `FlowForm` opens it. */
function start(): { draft: FlowDraft; employer: EmployerDraft } {
	return flowFormStart(doc, "base", salary, true, whatIfSession.whatIf)
}

/** The salary's share as the session shows it. */
function shownShare() {
	return employerOf(shownFlows(doc, whatIfSession.whatIf, "base"), "salary")
}

/** Tries the form, with fields edited as the person would edit them. */
async function tryForm(edit: Partial<FlowDraft>, employer: Partial<EmployerDraft> = {}) {
	const form = start()
	const saved = await saveFlow({
		name: "base",
		contentHash: HASH,
		doc,
		kind: "income",
		existing: salary,
		draft: { ...form.draft, ...edit },
		employer: { ...form.employer, ...employer },
		tryValue: true,
	})
	expect(saved.problems).toEqual({})
	return saved
}

describe("a salary switched off with its employer share", () => {
	test("its form reads the stored share, so nothing reads as cleared", () => {
		switchOff()
		expect(start().employer).toEqual({ account: "fund", share: "5.00", rounding: "floor" })
	})

	test("saving the form keeps the share it shows, rather than clearing it", () => {
		switchOff()
		const { draft, employer } = start()
		const saved = salaryFromDraft(draft, employer, { kind: "income", existing: salary, doc })
		expect(saved.ok && saved.employer).not.toBeNull()
		expect(saved.ok && saved.dropped).toBeNull()
	})

	test("a try with no edits leaves both off and sends nothing", async () => {
		switchOff()
		const saved = await tryForm({})
		expect(saved.done).toBe(true)
		expect(whatIfSession.whatIf?.removals).toEqual([...SPEC.paths])
		expect(overridesOf(whatIfSession.whatIf!)).toEqual({
			sets: [],
			removals: [...SPEC.paths],
			additions: [],
		})
	})

	test("an edit to the salary switches both on, and the share stays", async () => {
		switchOff()
		await tryForm({ amount: "95000.00" })
		expect(whatIfSession.isOffIn("base", "flows.salary")).toBe(false)
		expect(whatIfSession.isOffIn("base", "flows.salary-employer")).toBe(false)
		expect(whatIfSession.whatIf?.groups).toEqual([])
		expect(shownShare()?.percent).toBe("5.00")
	})

	test("an edit to the employer section alone switches both on", async () => {
		switchOff()
		await tryForm({}, { share: "7" })
		expect(whatIfSession.isOffIn("base", "flows.salary")).toBe(false)
		expect(shownShare()?.percent).toBe("7.00")
	})

	test("clearing the employer section switches the salary on and takes the share out", async () => {
		switchOff()
		const saved = await tryForm({}, employerDraftOf(null))
		expect(saved.done).toBe(true)
		expect(whatIfSession.isOffIn("base", "flows.salary")).toBe(false)
		expect(whatIfSession.isOffIn("base", "flows.salary-employer")).toBe(true)
	})

	test("a share a try cleared before the switch stays cleared when the salary switches off and on", async () => {
		await tryForm({}, employerDraftOf(null))
		switchOff()
		expect(whatIfSession.whatIf?.groups[0]?.held).toEqual(["flows.salary-employer"])
		whatIfSession.setGroupOff("base", HASH, SPEC, SPEC.paths, false)
		expect(whatIfSession.isOffIn("base", "flows.salary")).toBe(false)
		expect(whatIfSession.isOffIn("base", "flows.salary-employer")).toBe(true)
	})

	test("while off, its form starts from the share the try cleared, not the stored one", async () => {
		await tryForm({}, employerDraftOf(null))
		switchOff()
		expect(start().employer).toEqual(employerDraftOf(null))
	})

	test("an amount-only try while off keeps the share cleared", async () => {
		await tryForm({}, employerDraftOf(null))
		switchOff()
		await tryForm({ amount: "95000.00" })
		expect(whatIfSession.isOffIn("base", "flows.salary")).toBe(false)
		expect(whatIfSession.isOffIn("base", "flows.salary-employer")).toBe(true)
	})

	test("removing each change in turn never sends the salary without its share", async () => {
		await tryForm({}, employerDraftOf(null))
		switchOff()
		expect(overridesOf(whatIfSession.whatIf!).removals).toEqual([
			"flows.salary-employer",
			"flows.salary",
		])
		const group = whatIfSession.changes.find((change) => change.kind === "group")
		if (group === undefined) throw new Error("no group change")
		whatIfSession.removeChange(group)
		expect(overridesOf(whatIfSession.whatIf!).removals).toEqual(["flows.salary-employer"])
		const [shareChange] = whatIfSession.changes
		if (shareChange === undefined) throw new Error("no share change")
		whatIfSession.removeChange(shareChange)
		expect(whatIfSession.whatIf).toBeNull()
	})
})
