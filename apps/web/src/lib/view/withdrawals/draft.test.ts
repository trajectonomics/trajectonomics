import { describe, expect, test } from "bun:test"
import { scenarioFlow } from "../../contract"
import { flowCards } from "../plan-items/flows"
import { portfolioChoices, retirementMilestone, stoppableExpenses } from "./context"
import { withdrawalDocument } from "./document"
import { draftOf, type WithdrawalDraft } from "./draft"
import { CTX, DOC } from "./fixtures.test-support"
import { prepareWithdrawal } from "./plan"
import { ruleOf } from "./rule"

const typed = (patch: Partial<WithdrawalDraft>): WithdrawalDraft => ({
	...draftOf(undefined, CTX),
	frequency: "monthly",
	...patch,
})

describe("a new withdrawal form", () => {
	test("pre-fills no rate, no amount and no rounding, and says nothing about how to spend", () => {
		const draft = draftOf(undefined, CTX)
		expect(draft).toMatchObject({
			how: "",
			rate: "",
			amount: "",
			rounding: "",
			frequency: "",
			steps: [],
			stops: [],
		})
		expect(draft.floor).toEqual({ amount: "", growth: "", rate: "" })
		expect(draft.ceiling.growth).toBe("")
		expect(draft.upper).toEqual({ band: "", move: "" })
	})

	test("starts at the retirement Milestone as a selection, and reads the liquid assets of the withdraw list", () => {
		const draft = draftOf(undefined, CTX)
		expect(retirementMilestone(DOC)).toBe("retire")
		expect(draft).toMatchObject({ startMode: "milestone", milestone: "retire", start: "" })
		expect(draft.portfolio).toEqual(["cash", "index"])
	})

	test("never offers a debt or an Account that is not liquid, and the pension is offered but not pre-selected", () => {
		expect(portfolioChoices(CTX).map((choice) => choice.id)).toEqual(["cash", "index", "pension"])
	})

	test("a plan with no Milestone starts on a date", () => {
		const bare = { ...CTX, doc: { ...DOC, milestones: [] } }
		expect(draftOf(undefined, bare)).toMatchObject({ startMode: "date", milestone: "" })
	})
})

describe("the expenses that stop when the rule starts", () => {
	const form = { startMode: "milestone", milestone: "retire", start: "" }

	test("lists those still running at the start, and none is ticked", () => {
		expect(stoppableExpenses(CTX, form, "retirement-spending").map((flow) => flow.id)).toEqual([
			"rent",
		])
		expect(draftOf(undefined, CTX).stops).toEqual([])
	})

	test("a ticked one gets endAt at the same Milestone, in the one document the Edit saves; unticking takes it back", () => {
		const draft = typed({ how: "level", amount: "1", stops: ["rent"] })
		const ticked = prepareWithdrawal(draft, CTX, undefined)
		if (!ticked.ok) throw new Error("not made")
		expect(ticked.document.flows.find((flow) => flow.id === "rent")?.endAt).toBe("retire")
		expect(ticked.document.flows.find((flow) => flow.id === "gym")?.endAt).toBeUndefined()
		const saved = { ...CTX, doc: ticked.document }
		const again = prepareWithdrawal(
			{ ...draftOf(ticked.flow, saved), stops: [] },
			saved,
			ticked.flow,
		)
		expect(
			again.ok && again.document.flows.find((flow) => flow.id === "rent")?.endAt,
		).toBeUndefined()
	})

	test("a one-off paid before the start, and a Flow that ended before it, are not offered", () => {
		const flows = [
			{ id: "once-before", frequency: "once", start: "2027-01-01" },
			{ id: "once-after", frequency: "once", start: "2050-01-01" },
			{ id: "ended", frequency: "monthly", start: "2026-01-01", end: "2040-12-31" },
		].map((flow) =>
			scenarioFlow.parse({ ...flow, kind: "expense", amount: "1", growth: "inflation" }),
		)
		const ctx = { ...CTX, doc: { ...DOC, flows } }
		expect(stoppableExpenses(ctx, form, "x").map((flow) => flow.id)).toEqual(["once-after"])
	})

	test("a date start offers none, and an expense is never touched when it was not offered", () => {
		expect(
			stoppableExpenses(CTX, { startMode: "date", milestone: "", start: "2050-01-01" }, "x"),
		).toEqual([])
		const flow = scenarioFlow.parse({
			id: "x",
			kind: "expense",
			frequency: "monthly",
			start: "2026-01-01",
			startAt: "retire",
			amount: "1",
			growth: "inflation",
		})
		const out = withdrawalDocument(DOC, flow, { offered: [], ticked: ["rent"] })
		expect(out.flows.find((one) => one.id === "rent")?.endAt).toBeUndefined()
	})
})

describe("a rule written outside the form", () => {
	test("shows as an ordinary expense card with its rule in a sentence and no amount in it", () => {
		const outside = scenarioFlow.parse({
			id: "spending",
			kind: "expense",
			frequency: "annual",
			start: "2030-01-01",
			rule: {
				kind: "currentRate",
				portfolio: ["cash"],
				rateBps: "4.00",
				rounding: "floor",
				floor: { amount: "300000.00", growth: "inflation" },
			},
		})
		const [card] = flowCards([outside], "expense")
		expect(card).toMatchObject({ id: "spending", amount: null, editable: false })
		expect(card?.growth).toBe("Spends 4.00% of what savings are worth each year, with limits")
		expect(ruleOf(outside)?.kind).toBe("currentRate")
	})

	test("a rule this page does not read stays as it is", () => {
		const odd = scenarioFlow.parse({
			id: "odd",
			kind: "expense",
			frequency: "annual",
			start: "2030-01-01",
			rule: { kind: "future" },
		})
		expect(ruleOf(odd)).toBeNull()
		expect(flowCards([odd], "expense")[0]?.growth).toBe("Computed")
	})
})
