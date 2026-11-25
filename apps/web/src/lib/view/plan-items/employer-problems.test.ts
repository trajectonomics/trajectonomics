import { describe, expect, test } from "bun:test"
import { scenarioDocument } from "../../contract"
import { employerOf } from "./employer"
import { employerDraftOf } from "./employer-draft"
import { planDocument } from "./fixtures.test-support"
import { flowDraftOf } from "./flows"
import { salaryFromDraft, withoutSalary } from "./salary-draft"

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

describe("the employer section's problems", () => {
	test("a section filled in part is a problem at each field still empty, and a share with three places is one", () => {
		const doc = plan()
		const salary = salaryOf(doc)
		const run = (employer: typeof FIVE) =>
			salaryFromDraft(flowDraftOf(salary), employer, { kind: "income", existing: salary, doc })
		const part = run({ account: "", share: "5", rounding: "" })
		expect(part.ok || Object.keys(part.problems).sort()).toEqual([
			"employerAccount",
			"employerRounding",
		])
		const three = run({ ...FIVE, share: "5.005" })
		expect(three.ok || Object.keys(three.problems)).toEqual(["employerShare"])
		const debt = run({ ...FIVE, account: "loan" })
		expect(debt.ok || Object.keys(debt.problems)).toEqual(["employerAccount"])
	})

	test("an employer share on income that is not earned is refused at earned, because it stops with earned income", () => {
		const doc = plan()
		const salary = salaryOf(doc)
		const result = salaryFromDraft({ ...flowDraftOf(salary), earned: false }, FIVE, {
			kind: "income",
			existing: salary,
			doc,
		})
		expect(result.ok || Object.keys(result.problems)).toEqual(["earned"])
	})

	test("an item that has the employer id but not its shape is left alone, and the form refuses to overwrite it", () => {
		const doc = plan()
		const stray = {
			id: "salary-employer",
			kind: "expense",
			frequency: "monthly",
			start: "2026-11-01",
			amount: "1.00",
		}
		const holding = scenarioDocument.parse({ ...doc, flows: [...doc.flows, stray] })
		const salary = salaryOf(holding)
		expect(employerOf(holding.flows, "salary")).toBeNull()
		const result = salaryFromDraft(flowDraftOf(salary), FIVE, {
			kind: "income",
			existing: salary,
			doc: holding,
		})
		expect(result.ok || Object.keys(result.problems)).toEqual(["employerAccount"])
		const none = salaryFromDraft(flowDraftOf(salary), employerDraftOf(null), {
			kind: "income",
			existing: salary,
			doc: holding,
		})
		expect(none).toMatchObject({ ok: true, employer: null, dropped: null })
		expect(
			withoutSalary(holding, "salary").flows.some((flow) => flow.id === "salary-employer"),
		).toBe(true)
	})

	test("an expense form has no employer section: its draft is ignored", () => {
		const doc = plan()
		const rent = doc.flows.find((flow) => flow.id === "rent")
		const result = salaryFromDraft(flowDraftOf(rent), FIVE, {
			kind: "expense",
			existing: rent,
			doc,
		})
		expect(result).toMatchObject({ ok: true, employer: null })
	})
})
