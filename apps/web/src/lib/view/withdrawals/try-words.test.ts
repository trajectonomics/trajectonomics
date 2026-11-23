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
				"Retirement-spending: spends 3.50% of savings at the start, then cuts and raises by guardrails, from Savings account and Index fund",
			)
			expect(words).not.toContain("{")
			expect(words).not.toContain("300000")
		}
	})

	test("a level amount reads as one that keeps pace with inflation, with no amount", () => {
		const level = {
			id: "retirement-spending",
			kind: "expense",
			amount: "40000.00",
			growth: "inflation",
		}
		expect(tryWords(changeAt("flows.retirement-spending", level), account)).toBe(
			"Retirement-spending: a level amount that keeps pace with inflation",
		)
	})

	test("any other Flow tried as a whole reads in plain words, not as JSON", () => {
		const change = changeAt("flows.rent", { id: "rent", kind: "expense", endAt: "retire" })
		expect(change.label).toBe("Rent tried as edited")
		expect(tryWords(change, account)).toBe("Rent tried as edited")
	})
})
