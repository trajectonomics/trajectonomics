import { describe, expect, test } from "bun:test"
import type { Json } from "../../what-if/json"
import { changesOf, startWhatIf, withSet } from "../../what-if/session"
import { tryWords } from "./try-words"

const RULE = {
	kind: "guardrails",
	portfolio: ["cash", "index"],
	rateBps: "3.50",
	rounding: "floor",
	floor: { amount: "300000.00", growth: "inflation" },
}
const NAMES: Record<string, string> = { cash: "Savings account", index: "Index fund" }
const account = (id: string) => NAMES[id] ?? id

function changeAt(path: string, value: Json) {
	const [change] = changesOf(withSet(startWhatIf("base", "h"), path, value))
	if (change === undefined || change.kind !== "flow") throw new Error("not a Flow change")
	return change
}

describe("the session bar's words for a tried Flow", () => {
	test("a tried rule reads as its kind and share, with the Accounts by name, and holds no figure or raw JSON", () => {
		const flow = { id: "retirement-spending", kind: "expense", frequency: "monthly", rule: RULE }
		for (const change of [
			changeAt("flows.retirement-spending", flow),
			changeAt("flows.retirement-spending.rule", RULE),
		]) {
			const words = tryWords(change, account)
			expect(words).toBe(
				"retirement-spending: spends 3.50% of savings at the start, then cuts and raises by guardrails, from Savings account and Index fund",
			)
			expect(words).not.toContain("{")
			expect(words).not.toContain("300000")
		}
	})

	test("a Flow the plan labels reads its label, and one it does not label reads its id", () => {
		const flow = { id: "retirement-spending", kind: "expense", frequency: "monthly", rule: RULE }
		const change = changeAt("flows.retirement-spending", flow)
		const labelled = (id: string) => (id === "retirement-spending" ? "Retirement spending" : id)
		expect(tryWords(change, account, labelled)).toBe(
			"Retirement spending: spends 3.50% of savings at the start, then cuts and raises by guardrails, from Savings account and Index fund",
		)
		expect(tryWords(change, account)).toBe(
			"retirement-spending: spends 3.50% of savings at the start, then cuts and raises by guardrails, from Savings account and Index fund",
		)
	})

	test("two Flows that share a label read the label and the id in the session bar", () => {
		const flow = { id: "retirement-spending", kind: "expense", frequency: "monthly", rule: RULE }
		const change = changeAt("flows.retirement-spending", flow)
		const twin = (id: string) => `Retirement spending (${id})`
		expect(tryWords(change, account, twin)).toBe(
			"Retirement spending (retirement-spending): spends 3.50% of savings at the start, then cuts and raises by guardrails, from Savings account and Index fund",
		)
	})

	test("a level amount reads as one that keeps pace with inflation, with no amount", () => {
		const level = {
			id: "retirement-spending",
			kind: "expense",
			amount: "40000.00",
			growth: "inflation",
		}
		expect(tryWords(changeAt("flows.retirement-spending", level), account)).toBe(
			"retirement-spending: a level amount that keeps pace with inflation",
		)
		expect(
			tryWords(changeAt("flows.retirement-spending", level), account, () => "Retirement spending"),
		).toBe("Retirement spending: a level amount that keeps pace with inflation")
	})

	test("any other Flow tried as a whole reads in plain words, not as JSON", () => {
		const change = changeAt("flows.rent", { id: "rent", kind: "expense", endAt: "retire" })
		expect(change.label).toBe("Rent tried as edited")
		expect(tryWords(change, account)).toBe("Rent tried as edited")
	})

	test("a whole-Flow try that only adds a field keeps the session's own words", () => {
		const gym = {
			id: "gym",
			kind: "expense",
			frequency: "monthly",
			start: "2026-11-01",
			amount: "100.00",
			growth: "inflation",
			end: "2027-04-30",
		}
		const change = changeAt("flows.gym", gym)
		expect(change.label).toBe("Gym tried as edited")
		expect(tryWords(change, account)).toBe("Gym tried as edited")
	})
})
