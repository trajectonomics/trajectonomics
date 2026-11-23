import { describe, expect, test } from "bun:test"
import { scenarioFlow } from "../../contract"
import { sameJson } from "../../what-if/same-json"
import { recordOf } from "../../what-if/session-items"
import { withdrawalFromDraft } from "./build"
import { draftOf, type WithdrawalDraft } from "./draft"
import { CTX, DOC } from "./fixtures.test-support"

const taken = DOC.flows.map((flow) => flow.id)
const build = (draft: WithdrawalDraft, existing?: ReturnType<typeof scenarioFlow.parse>) =>
	withdrawalFromDraft(draft, { existing, taken, asOf: CTX.asOf })
const typed = (patch: Partial<WithdrawalDraft>): WithdrawalDraft => ({
	...draftOf(undefined, CTX),
	...patch,
})

describe("each way of spending writes the Flow the CLI's schema takes", () => {
	const base = { rounding: "floor", rate: "4", frequency: "annual" }

	test("a level amount is a plain expense that follows inflation, with no rule", () => {
		const made = build(typed({ how: "level", amount: "40,000.00", frequency: "monthly" }))
		if (!made.ok) throw new Error("not made")
		expect(made.flow).toMatchObject({
			id: "retirement-spending",
			kind: "expense",
			amount: "40000.00",
			growth: "inflation",
			startAt: "retire",
			start: "2026-10-31",
		})
		expect(made.flow.rule).toBeUndefined()
	})

	test("a share at the start is an initialRate rule with its rounding and Accounts", () => {
		const made = build(typed({ how: "initialRate", ...base }))
		if (!made.ok) throw new Error("not made")
		expect(made.flow.rule).toEqual({
			kind: "initialRate",
			portfolio: ["cash", "index"],
			rateBps: "4",
			rounding: "floor",
		})
	})

	test("a share each year takes steps, a floor and a ceiling, each only when typed", () => {
		const made = build(
			typed({
				how: "currentRate",
				...base,
				steps: [{ from: "2055-01-01", rate: "5" }],
				floor: { amount: "300000", growth: "inflation", rate: "" },
				ceiling: { amount: "900000.50", growth: "fixed", rate: "2.5" },
			}),
		)
		if (!made.ok) throw new Error("not made")
		expect(made.flow.rule).toEqual({
			kind: "currentRate",
			portfolio: ["cash", "index"],
			rateBps: "4",
			rounding: "floor",
			steps: [{ from: "2055-01-01", bps: "5" }],
			floor: { amount: "300000", growth: "inflation" },
			ceiling: { amount: "900000.50", growth: { bps: 250 } },
		})
		const plain = build(typed({ how: "currentRate", ...base }))
		expect(plain.ok && plain.flow.rule && "floor" in plain.flow.rule).toBe(false)
	})

	test("guardrails with only the raise never cut", () => {
		const made = build(typed({ how: "guardrails", ...base, lower: { band: "20", move: "10" } }))
		if (!made.ok) throw new Error("not made")
		expect(made.flow.rule).toEqual({
			kind: "guardrails",
			portfolio: ["cash", "index"],
			rateBps: "4",
			rounding: "floor",
			lower: { bps: "20", adjustBps: "10" },
		})
	})

	test("a date start writes no Milestone, and a Milestone start keeps the Flow's own start", () => {
		const dated = build(
			typed({ how: "level", amount: "1", startMode: "date", start: "2050-01-01" }),
		)
		expect(dated.ok && dated.flow).toMatchObject({ start: "2050-01-01" })
		expect(dated.ok && dated.flow.startAt).toBeUndefined()
	})
})

describe("a form that is not complete shows its problems at the fields", () => {
	test("no choice, no rate and no rounding are each a problem, and nothing is made", () => {
		expect(build(typed({}))).toMatchObject({ ok: false, problems: { how: expect.any(String) } })
		const made = build(typed({ how: "currentRate", portfolio: [] }))
		expect(made).toMatchObject({
			ok: false,
			problems: {
				rate: expect.any(String),
				rounding: expect.any(String),
				portfolio: expect.any(String),
			},
		})
	})

	test("a rate with a third place, a negative one and a bound that is not a number are refused", () => {
		const rates = ["4.001", "-4", "four"].map((rate) =>
			build(typed({ how: "initialRate", rounding: "floor", rate })),
		)
		for (const made of rates)
			expect(made).toMatchObject({ ok: false, problems: { rate: expect.any(String) } })
		const bound = build(
			typed({
				how: "currentRate",
				rounding: "floor",
				rate: "4",
				floor: { amount: "9,00", growth: "inflation", rate: "" },
			}),
		)
		expect(bound).toMatchObject({ ok: false, problems: { floor: expect.any(String) } })
	})

	test("guardrails with neither a cut nor a raise, and half a guardrail, are refused", () => {
		const none = build(typed({ how: "guardrails", rounding: "floor", rate: "4" }))
		expect(none).toMatchObject({ ok: false, problems: { upper: expect.any(String) } })
		const half = build(
			typed({ how: "guardrails", rounding: "floor", rate: "4", upper: { band: "20", move: "" } }),
		)
		expect(half).toMatchObject({ ok: false, problems: { upper: expect.any(String) } })
	})
})

describe("editing reads the Flow back into the form", () => {
	const cases: Partial<WithdrawalDraft>[] = [
		{ how: "level", amount: "40000.00", frequency: "monthly" },
		{ how: "initialRate", rate: "4.00", rounding: "halfUp", frequency: "annual" },
		{
			how: "currentRate",
			rate: "4.00",
			rounding: "ceil",
			steps: [{ from: "2055-01-01", rate: "5.00" }],
			floor: { amount: "300000.00", growth: "inflation", rate: "" },
			ceiling: { amount: "900000.00", growth: "fixed", rate: "2.50" },
		},
		{
			how: "guardrails",
			rate: "4.00",
			rounding: "floor",
			upper: { band: "20.00", move: "10.00" },
			lower: { band: "20.00", move: "10.00" },
		},
	]
	for (const patch of cases) {
		test(`a ${patch.how} Flow round-trips through the form`, () => {
			const first = build(typed(patch))
			if (!first.ok) throw new Error(JSON.stringify(first.problems))
			const again = build(draftOf(first.flow, CTX), first.flow)
			if (!again.ok) throw new Error("not made")
			expect(sameJson(recordOf(again.flow), recordOf(first.flow))).toBe(true)
			expect(draftOf(first.flow, CTX)).toMatchObject(patch)
		})
	}

	test("an existing Flow keeps the fields the form does not show", () => {
		const first = build(typed({ how: "level", amount: "1" }))
		if (!first.ok) throw new Error("not made")
		const flow = scenarioFlow.parse({ ...first.flow, category: "retirement", end: "2090-01-01" })
		const again = build(draftOf(flow, CTX), flow)
		expect(again.ok && again.flow).toMatchObject({ category: "retirement", end: "2090-01-01" })
	})
})
