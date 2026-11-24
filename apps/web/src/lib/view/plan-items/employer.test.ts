import { describe, expect, test } from "bun:test"
import { scenarioDocument } from "../../contract"
import { employerOf, employerTargets, employerText, salaryDeleteNote } from "./employer"
import { employerDraftOf } from "./employer-draft"
import { planDocument } from "./fixtures.test-support"
import { flowDraftOf } from "./flows"
import { salaryFromDraft, withoutSalary, withSalary } from "./salary-draft"

/** The fixture plan with a provident fund, a home that is not liquid and a salary that ends at a Milestone. */
function plan() {
	const base = planDocument()
	return scenarioDocument.parse({
		...base,
		accounts: [
			...base.accounts,
			{ id: "provident-fund", kind: "asset", rate: 300 },
			{ id: "home", kind: "asset", rate: 0, liquid: false },
		],
		flows: base.flows.map((flow) =>
			flow.id === "salary" ? { ...flow, endAt: "retire", end: undefined } : flow,
		),
	})
}

const salaryOf = (doc: ReturnType<typeof plan>) => {
	const salary = doc.flows.find((flow) => flow.id === "salary")
	if (salary === undefined) throw new Error("no salary")
	return salary
}

const FIVE = { account: "provident-fund", share: "5", rounding: "floor" }

describe("what the employer section holds before the person fills it in", () => {
	test("a salary with no employer Flow has an empty section: no Account, no share, no rounding", () => {
		const doc = plan()
		expect(employerOf(doc.flows, "salary")).toBeNull()
		expect(employerDraftOf(null)).toEqual({ account: "", share: "", rounding: "" })
	})

	test("only an asset that is not illiquid can be paid into: a debt and a home are not offered", () => {
		expect(employerTargets(plan())).toEqual(["bank", "provident-fund"])
	})
})

describe("saving a salary with an employer share", () => {
	test("writes one Contribution with funding employer and a derive that reads the salary, with the salary's own gates", () => {
		const doc = plan()
		const salary = salaryOf(doc)
		const result = salaryFromDraft(flowDraftOf(salary), FIVE, {
			kind: "income",
			existing: salary,
			doc,
		})
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.employer).toEqual({
			id: "salary-employer",
			kind: "contribution",
			target: "provident-fund",
			funding: "employer",
			frequency: "monthly",
			start: "2026-11-01",
			endAt: "retire",
			derive: {
				measures: [
					{ id: "pay", op: "flow", flow: "salary" },
					{ id: "share", op: "scale", of: "pay", num: 500, den: 10000, rounding: "floor" },
				],
				result: "share",
			},
		})
		expect(result.employer).not.toHaveProperty("amount")
		expect(result.employer).not.toHaveProperty("label")
	})

	test("the salary and the employer Flow go into one document, and the round trip shows the same section", () => {
		const doc = plan()
		const salary = salaryOf(doc)
		const result = salaryFromDraft(
			flowDraftOf(salary),
			{ ...FIVE, share: "7.5" },
			{ kind: "income", existing: salary, doc },
		)
		if (!result.ok) throw new Error("not ok")
		const saved = withSalary(doc, result)
		expect(saved.flows.map((flow) => flow.id)).toEqual([
			...doc.flows.map((flow) => flow.id),
			"salary-employer",
		])
		const share = employerOf(saved.flows, "salary")
		expect(share).toMatchObject({ account: "provident-fund", percent: "7.50", rounding: "floor" })
		expect(employerDraftOf(share)).toEqual({
			account: "provident-fund",
			share: "7.50",
			rounding: "floor",
		})
		expect(employerText(saved.flows, salaryOf(saved), "income")).toBe(
			"Employer adds 7.5% to provident-fund",
		)
	})

	test("editing the salary keeps the employer Flow in step: its start and end follow, and nothing else of it moves", () => {
		const doc = plan()
		const salary = salaryOf(doc)
		const first = salaryFromDraft(flowDraftOf(salary), FIVE, {
			kind: "income",
			existing: salary,
			doc,
		})
		if (!first.ok) throw new Error("not ok")
		const saved = withSalary(doc, first)
		const edited = salaryOf(saved)
		const draft = { ...flowDraftOf(edited), start: "2027-02-01", end: "2049-12-31" }
		const again = salaryFromDraft(draft, employerDraftOf(employerOf(saved.flows, "salary")), {
			kind: "income",
			existing: edited,
			doc: saved,
		})
		if (!again.ok) throw new Error(JSON.stringify(again.problems))
		expect(again.employer).toMatchObject({
			start: "2027-02-01",
			end: "2049-12-31",
			endAt: "retire",
			target: "provident-fund",
		})
		expect(again.dropped).toBeNull()
	})

	test("clearing the section takes the employer Flow out of the document; deleting the salary takes both out", () => {
		const doc = plan()
		const salary = salaryOf(doc)
		const first = salaryFromDraft(flowDraftOf(salary), FIVE, {
			kind: "income",
			existing: salary,
			doc,
		})
		if (!first.ok) throw new Error("not ok")
		const saved = withSalary(doc, first)
		const cleared = salaryFromDraft(flowDraftOf(salaryOf(saved)), employerDraftOf(null), {
			kind: "income",
			existing: salaryOf(saved),
			doc: saved,
		})
		if (!cleared.ok) throw new Error("not ok")
		expect(cleared.dropped).toBe("salary-employer")
		expect(withSalary(saved, cleared).flows.map((flow) => flow.id)).toEqual(
			doc.flows.map((flow) => flow.id),
		)
		expect(withoutSalary(saved, "salary").flows.map((flow) => flow.id)).toEqual([
			"pension",
			"rent",
			"tax-refund",
		])
	})

	test("saving a salary with an empty section writes the document it had, and never an employer Flow", () => {
		const doc = plan()
		const salary = salaryOf(doc)
		const result = salaryFromDraft(flowDraftOf(salary), employerDraftOf(null), {
			kind: "income",
			existing: salary,
			doc,
		})
		expect(result).toEqual({ ok: true, flow: salary, employer: null, dropped: null })
		expect(withSalary(doc, result as never)).toEqual(doc)
	})
})

describe("what deleting a salary says it takes with it", () => {
	test("a salary that carries an employer share names the Flow deleted with it, and one without says nothing", () => {
		const doc = plan()
		expect(salaryDeleteNote(doc.flows, "salary")).toBeUndefined()
		const salary = salaryOf(doc)
		const saved = salaryFromDraft(flowDraftOf(salary), FIVE, {
			kind: "income",
			existing: salary,
			doc,
		})
		if (!saved.ok) throw new Error(JSON.stringify(saved.problems))
		expect(salaryDeleteNote(withSalary(doc, saved).flows, "salary")).toBe(
			"Its employer share (salary-employer) is deleted with it.",
		)
	})
})
