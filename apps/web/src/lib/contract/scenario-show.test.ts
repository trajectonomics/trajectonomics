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

	it("decodes a level loan whose payments are outside the bounds the CLI stated when this contract was written (#336)", () => {
		const loan = {
			...DOCUMENT,
			flows: [
				{
					id: "pay",
					kind: "contribution",
					target: "loan",
					frequency: "monthly",
					start: "2030-01-31",
					level: { principal: "1000000.00", payments: 200000, rounding: "someNewRounding" },
				},
			],
		}
		expect(scenarioDocument.safeParse(loan).success).toBe(true)
		expect(scenarioDocument.parse(loan) as unknown).toEqual(loan)
	})

	it("refuses a level loan whose payments are not a whole number", () => {
		const loan = {
			...DOCUMENT,
			flows: [
				{
					id: "pay",
					kind: "contribution",
					target: "loan",
					frequency: "monthly",
					start: "2030-01-31",
					level: { principal: "1000000.00", payments: 12.5, rounding: "ceil" },
				},
			],
		}
		expect(scenarioDocument.safeParse(loan).success).toBe(false)
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
