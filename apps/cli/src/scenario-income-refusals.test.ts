import { describe, expect, it } from "bun:test"
import { INCOME_PLAN, planHome } from "./projection-income-support"
import { applyScenario } from "./scenario-test-support"
import { errorOf } from "./test-support"

/*
 * The refusals of an Account's payout and fee and of an employer's share, said in words (cli
 * ADR-0067): each is found by the document check alone, so `scenario apply` states it.
 */

const account = (id: string, patch: Record<string, unknown>) =>
	INCOME_PLAN.accounts.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))

const flow = (id: string, patch: Record<string, unknown>) =>
	INCOME_PLAN.flows.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))

const CASES: { name: string; doc: Record<string, unknown>; path: string; sentence: RegExp }[] = [
	{
		name: "a payout from an Illiquid asset",
		doc: { accounts: account("fund", { liquid: false }) },
		path: "document.accounts.2.payout",
		sentence: /Illiquid asset carries a payout/,
	},
	{
		name: "an employer share paid into an Illiquid asset",
		doc: { accounts: account("provident", { liquid: false }) },
		path: "document.flows.2.funding",
		sentence: /employer Contribution pays into an Illiquid asset/,
	},
	{
		name: "an employer share paid into a liability",
		doc: { accounts: account("provident", { kind: "liability" }) },
		path: "document.flows.2.funding",
		sentence: /pays into a liability/,
	},
	{
		name: "a payout share above 100%",
		doc: {
			accounts: account("fund", {
				payout: { bps: 10_001, frequency: "annual", rounding: "floor" },
			}),
		},
		path: "document.accounts.2.payout.bps",
		sentence: /share an Account pays out each year must be from 0% to 100%/,
	},
	{
		name: "a fee above 100%",
		doc: { accounts: account("fund", { fee: { bps: 10_001, rounding: "floor" } }) },
		path: "document.accounts.2.fee.bps",
		sentence: /fee an Account charges each year must be from 0% to 100%/,
	},
	{
		name: "a payout with no frequency",
		doc: { accounts: account("fund", { payout: { bps: 400, rounding: "floor" } }) },
		path: "document.accounts.2.payout.frequency",
		sentence: /MISSING_KEY/,
	},
	{
		name: "a fee on a liability",
		doc: { accounts: account("fund", { kind: "liability", payout: undefined }) },
		path: "document.accounts.2.fee",
		sentence: /LIABILITY_MISUSE/,
	},
	{
		name: "a spending rule on an employer share",
		doc: { flows: flow("match", { rule: { kind: "initialRate" } }) },
		path: "document.flows.2.rule",
		sentence: /Spending rule|spending rule|expense|RULE_NOT_EXPENSE/,
	},
	{
		name: "a payout label with no Levy to tally it",
		doc: {
			accounts: account("fund", {
				payout: {
					bps: 400,
					frequency: "annual",
					rounding: "floor",
					label: "income.section40_4.dividends",
				},
			}),
		},
		path: "document.accounts.2.payout.label",
		sentence: /LEVY_REQUIRED/,
	},
]

describe("the refusals an Account's income and an employer's share draw", () => {
	for (const { name, doc, path, sentence } of CASES) {
		it(`says ${name} in words, at its field`, async () => {
			const home = await planHome()
			const res = await applyScenario(home, "other", { ...INCOME_PLAN, ...doc })
			expect(res.code).toBe(2)
			const error = errorOf(res)
			expect(error.path).toBe(path)
			expect(error.message).toMatch(sentence)
		})
	}
})
