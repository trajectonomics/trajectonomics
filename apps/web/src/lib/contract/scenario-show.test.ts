import { describe, expect, it } from "bun:test"
import { scenarioDocument } from "./scenario-show"

/*
 * The Scenario document in its decimal form with the routing forms and a transfer Flow (cli ADR-0070): the
 * Dashboard's contract decodes what `traj scenario show --decimal` writes, and keeps each key as it is.
 */

const DOCUMENT = {
	currency: "THB",
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	flows: [
		{
			id: "roll",
			kind: "transfer",
			source: "pvd",
			target: "rmf",
			realise: true,
			frequency: "once",
			start: "2030-06-30",
			amount: "1000.00",
			growth: { bps: 0 },
		},
	],
	cashflow: {
		surplus: [
			{ account: "emergency", upTo: { amount: "100000.00", growth: "inflation" } },
			{ account: "funds", share: "50.00", upTo: "50000.00" },
			{ account: "cash" },
		],
		contribute: [],
		withdraw: [
			{ account: "emergency", downTo: { amount: "20000.00", growth: { bps: 100 } } },
			"cash",
		],
	},
}

describe("the Scenario document contract with the routing forms", () => {
	it("decodes a share, a target that keeps its value, a floor and a transfer, and keeps them as they are", () => {
		expect(scenarioDocument.parse(DOCUMENT) as unknown).toEqual(DOCUMENT)
	})

	it("still decodes a plain document, and one with no cashflow", () => {
		const plain = {
			...DOCUMENT,
			flows: [],
			cashflow: {
				surplus: [{ account: "cash", upTo: "500.00" }],
				contribute: [],
				withdraw: ["cash"],
			},
		}
		expect(scenarioDocument.safeParse(plain).success).toBe(true)
		const { cashflow: _cashflow, ...without } = plain
		expect(scenarioDocument.safeParse(without).success).toBe(true)
	})

	it("refuses a share that is a number, not a percent string, and a target that is not money", () => {
		const share = {
			...DOCUMENT,
			cashflow: { ...DOCUMENT.cashflow, surplus: [{ account: "cash", share: 5000 }] },
		}
		expect(scenarioDocument.safeParse(share).success).toBe(false)
		const target = {
			...DOCUMENT,
			cashflow: { ...DOCUMENT.cashflow, withdraw: [{ account: "cash", downTo: 3000 }] },
		}
		expect(scenarioDocument.safeParse(target).success).toBe(false)
	})
})
