import { describe, expect, test } from "bun:test"
import type { ScenarioDocument } from "../contract"
import { overlayDocument } from "./overlay"

const DOC = {
	currency: "THB",
	flows: [
		{ id: "gym", kind: "expense", amount: "100.00", frequency: "monthly", start: "2026-01-01" },
		{ id: "salary", kind: "income", amount: "5000.00", frequency: "monthly", start: "2026-01-01" },
	],
	accounts: [{ id: "cash", kind: "asset", rate: 100 }],
} as unknown as ScenarioDocument

describe("a plan's document with the session's changes put in", () => {
	test("a Set replaces the value at its path and nothing else", () => {
		const out = overlayDocument(DOC, {
			sets: [{ path: "flows.salary.amount", value: "6000.00" }],
			removals: [],
		})
		expect(out.flows.find((flow) => flow.id === "salary")?.amount).toBe("6000.00")
		expect(out.flows.find((flow) => flow.id === "gym")?.amount).toBe("100.00")
		expect(DOC.flows[1]?.amount).toBe("5000.00")
	})

	test("a Removal takes the item out by its id, in its own list", () => {
		const out = overlayDocument(DOC, { sets: [], removals: ["flows.gym", "accounts.cash"] })
		expect(out.flows.map((flow) => flow.id)).toEqual(["salary"])
		expect(out.accounts).toEqual([])
	})

	test("a Set on a path the item does not hold is left out, as is a Set on a removed item", () => {
		const out = overlayDocument(DOC, {
			sets: [
				{ path: "flows.salary.nope", value: "1" },
				{ path: "flows.gym.amount", value: "1.00" },
			],
			removals: ["flows.gym"],
		})
		expect(out.flows).toEqual([DOC.flows[1] as never])
	})
})

describe("a whole item Set", () => {
	test("takes the item's place, so an Account's first fee shows in the what-if", () => {
		const fee = { id: "cash", kind: "asset", rate: 100, fee: { bps: "1.50", rounding: "floor" } }
		const out = overlayDocument(DOC, {
			sets: [{ path: "accounts.cash", value: fee }],
			removals: [],
		})
		expect(out.accounts).toEqual([fee as never])
	})
})
